import { create } from 'zustand'
import { loadDocument, saveDocument } from '@/lib/api'
import type {
  Employee,
  Event,
  Id,
  PlanningData,
  Settings,
  Shift,
  ShiftTemplate,
  Team,
} from '@/lib/types'

/**
 * L'état de l'application, adossé au fichier `data/planning.json`.
 *
 * Chaque mutation produit un nouveau document et programme une sauvegarde.
 * Les écritures sont regroupées : taper dans un formulaire ne doit pas
 * déclencher une écriture disque par frappe. En contrepartie il faut vider la
 * file d'attente avant que l'onglet ne se ferme — voir `flushPendingSave`.
 */

const SAVE_DEBOUNCE_MS = 400

export type LoadStatus = 'loading' | 'ready' | 'error'
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'error'

interface DataState {
  status: LoadStatus
  loadError: string | null
  document: PlanningData | null
  file: string
  savedAt: string | null
  saveStatus: SaveStatus
  saveError: string | null

  load: () => Promise<void>
  /** Applique une transformation pure au document et programme l'écriture. */
  mutate: (recipe: (current: PlanningData) => PlanningData) => void
  /** Écrit tout de suite ce qui est en attente (fermeture d'onglet, import). */
  flush: () => Promise<void>
  /** Remplace intégralement le document — import de sauvegarde, remise à zéro. */
  replace: (next: PlanningData) => void

  upsertEmployee: (employee: Employee) => void
  removeEmployee: (id: Id) => void
  upsertTeam: (team: Team) => void
  removeTeam: (id: Id) => void
  upsertTemplate: (template: ShiftTemplate) => void
  removeTemplate: (id: Id) => void
  upsertShift: (shift: Shift) => void
  removeShift: (id: Id) => void
  upsertEvent: (event: Event) => void
  removeEvent: (id: Id) => void
  updateSettings: (patch: Partial<Settings>) => void
}

export const newId = (): Id =>
  // randomUUID n'existe pas hors contexte sécurisé ; sur 127.0.0.1 il est
  // disponible, mais le repli évite un plantage si l'app est ouverte autrement.
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Remplace l'élément de même id, ou l'ajoute s'il est nouveau. */
const upsert = <T extends { id: Id }>(items: T[], item: T): T[] => {
  const index = items.findIndex((candidate) => candidate.id === item.id)
  if (index === -1) return [...items, item]
  return items.map((candidate, i) => (i === index ? item : candidate))
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<void> = Promise.resolve()

export const useDataStore = create<DataState>()((set, get) => {
  /** Écrit le document courant ; les erreurs remontent à l'indicateur d'état. */
  const writeNow = async () => {
    const document = get().document
    if (!document) return
    set({ saveStatus: 'saving', saveError: null })
    try {
      const result = await saveDocument(document)
      // Une autre mutation a pu arriver pendant l'écriture : dans ce cas un
      // nouveau minuteur tourne déjà et c'est lui qui décidera de l'état final.
      if (saveTimer === null) set({ saveStatus: 'idle', savedAt: result.savedAt })
      else set({ savedAt: result.savedAt })
    } catch (error) {
      set({ saveStatus: 'error', saveError: (error as Error).message })
    }
  }

  const scheduleSave = () => {
    set({ saveStatus: 'pending' })
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      inFlight = inFlight.then(writeNow)
    }, SAVE_DEBOUNCE_MS)
  }

  const mutate: DataState['mutate'] = (recipe) => {
    const current = get().document
    if (!current) return
    set({ document: recipe(current) })
    scheduleSave()
  }

  return {
    status: 'loading',
    loadError: null,
    document: null,
    file: 'data/planning.json',
    savedAt: null,
    saveStatus: 'idle',
    saveError: null,

    load: async () => {
      set({ status: 'loading', loadError: null })
      try {
        const result = await loadDocument()
        set({
          status: 'ready',
          document: result.document,
          file: result.file,
          savedAt: result.savedAt,
        })
      } catch (error) {
        set({ status: 'error', loadError: (error as Error).message })
      }
    },

    mutate,

    flush: async () => {
      if (saveTimer !== null) {
        clearTimeout(saveTimer)
        saveTimer = null
        inFlight = inFlight.then(writeNow)
      }
      await inFlight
    },

    replace: (next) => {
      set({ document: next })
      scheduleSave()
    },

    upsertEmployee: (employee) =>
      mutate((doc) => ({ ...doc, employees: upsert(doc.employees, employee) })),

    // Supprimer quelqu'un supprime ses créneaux : les garder produirait des
    // heures fantômes dans tous les totaux, sans moyen de les retrouver.
    // L'archivage reste l'option pour conserver l'historique.
    removeEmployee: (id) =>
      mutate((doc) => ({
        ...doc,
        employees: doc.employees.filter((employee) => employee.id !== id),
        shifts: doc.shifts.filter((shift) => shift.employeeId !== id),
        events: doc.events.filter((event) => event.employeeId !== id),
      })),

    upsertTeam: (team) => mutate((doc) => ({ ...doc, teams: upsert(doc.teams, team) })),

    removeTeam: (id) =>
      mutate((doc) => ({
        ...doc,
        teams: doc.teams.filter((team) => team.id !== id),
        employees: doc.employees.map((employee) =>
          employee.teamId === id ? { ...employee, teamId: null } : employee,
        ),
      })),

    upsertTemplate: (template) =>
      mutate((doc) => ({ ...doc, shiftTemplates: upsert(doc.shiftTemplates, template) })),

    // Les créneaux déjà posés survivent à la suppression de leur modèle : ils
    // en portent une copie complète (nom, horaires, couleur), c'est justement
    // ce que permet le choix de copier plutôt que de référencer.
    removeTemplate: (id) =>
      mutate((doc) => ({
        ...doc,
        shiftTemplates: doc.shiftTemplates.filter((template) => template.id !== id),
        shifts: doc.shifts.map((shift) =>
          shift.templateId === id ? { ...shift, templateId: null } : shift,
        ),
      })),

    upsertShift: (shift) => mutate((doc) => ({ ...doc, shifts: upsert(doc.shifts, shift) })),

    removeShift: (id) =>
      mutate((doc) => ({ ...doc, shifts: doc.shifts.filter((shift) => shift.id !== id) })),

    upsertEvent: (event) => mutate((doc) => ({ ...doc, events: upsert(doc.events, event) })),

    removeEvent: (id) =>
      mutate((doc) => ({ ...doc, events: doc.events.filter((event) => event.id !== id) })),

    updateSettings: (patch) =>
      mutate((doc) => ({ ...doc, settings: { ...doc.settings, ...patch } })),
  }
})

/**
 * Filet de sécurité : la sauvegarde est différée de 400 ms, donc fermer
 * l'onglet juste après une modification pourrait la perdre. `visibilitychange`
 * est le seul événement dont les navigateurs garantissent encore le
 * déclenchement à la fermeture — `beforeunload` ne l'est plus.
 */
export const installSaveGuards = () => {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void useDataStore.getState().flush()
  })
}
