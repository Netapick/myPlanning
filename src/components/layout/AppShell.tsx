import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { IconAlert } from '@/components/ui/icons'
import { EmployeeForm } from '@/features/personnel/EmployeeForm'
import { type AvailableUpdate, checkForUpdate } from '@/lib/appUpdate'
import { isTauri } from '@/lib/api'
import { EMPTY_EMPLOYEES, EMPTY_EVENTS, EMPTY_SHIFTS, EMPTY_TEAMS, useDataStore } from '@/store/data'
import { useUiStore } from '@/store/ui'
import { SideNav } from './SideNav'
import { SPLASH_MAX_MS, SPLASH_MIN_MS, SplashScreen } from './SplashScreen'
import { TopBar } from './TopBar'
import { UpdateBanner } from './UpdateBanner'

/** Survit à un F5 (même session) mais pas à une fermeture/réouverture de fenêtre ni à un relancement de l'exécutable. */
const SPLASH_KEY = 'myplanning.splashShown'

/**
 * Coquille de l'application : barre latérale + barre du haut + plan de
 * travail. Elle porte aussi le chargement du document — aucun écran ne
 * s'affiche avant que `data/planning.json` ne soit lu, ce qui évite à chacun
 * d'eux d'avoir à gérer l'état « pas encore de données ».
 */
export function AppShell() {
  const status = useDataStore((state) => state.status)
  const loadError = useDataStore((state) => state.loadError)
  const load = useDataStore((state) => state.load)
  const location = useLocation()
  const navigationType = useNavigationType()
  const recordNavigation = useUiStore((state) => state.recordNavigation)
  const employeeProfile = useUiStore((state) => state.employeeProfile)
  const closeEmployeeProfile = useUiStore((state) => state.closeEmployeeProfile)
  const employees = useDataStore((state) => state.document?.employees ?? EMPTY_EMPLOYEES)
  const teams = useDataStore((state) => state.document?.teams ?? EMPTY_TEAMS)
  const events = useDataStore((state) => state.document?.events ?? EMPTY_EVENTS)
  const shifts = useDataStore((state) => state.document?.shifts ?? EMPTY_SHIFTS)
  const upsertEmployee = useDataStore((state) => state.upsertEmployee)

  // Lazy initializer : posé une seule fois, de façon synchrone, au tout
  // premier rendu — pas de risque de double-affichage du splash en StrictMode.
  const [isFreshSession] = useState(() => {
    try {
      if (sessionStorage.getItem(SPLASH_KEY)) return false
      sessionStorage.setItem(SPLASH_KEY, '1')
      return true
    } catch {
      return false
    }
  })
  const [splashFloorDone, setSplashFloorDone] = useState(false)
  const [splashCeilingHit, setSplashCeilingHit] = useState(false)
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  // Check en tâche de fond, une fois par lancement — jamais bloquant pour le
  // mode hors-ligne (checkForUpdate avale déjà toute erreur réseau).
  // Absent en mode web : il n'y a pas de version installable à mettre à jour.
  useEffect(() => {
    if (!isTauri()) return
    void checkForUpdate(__APP_VERSION__).then(setAvailableUpdate)
  }, [])

  useEffect(() => {
    recordNavigation(location.pathname + location.search, navigationType)
  }, [location, navigationType, recordNavigation])

  useEffect(() => {
    if (!isFreshSession) return
    const timer = setTimeout(() => setSplashFloorDone(true), SPLASH_MIN_MS)
    return () => clearTimeout(timer)
  }, [isFreshSession])

  // Filet de sécurité : même si `load()` traîne anormalement (disque lent,
  // erreur), le splash ne doit jamais rester affiché au-delà de ce plafond —
  // l'utilisateur retombe alors sur l'indicateur « Chargement du planning… »
  // déjà présent dans <main>.
  useEffect(() => {
    if (!isFreshSession) return
    const timer = setTimeout(() => setSplashCeilingHit(true), SPLASH_MAX_MS)
    return () => clearTimeout(timer)
  }, [isFreshSession])

  const showSplash = isFreshSession && !splashCeilingHit && (status === 'loading' || !splashFloorDone)

  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {availableUpdate ? (
          <UpdateBanner update={availableUpdate} onDismiss={() => setAvailableUpdate(null)} />
        ) : null}
        {/* Seul point de défilement pour les écrans qui ne gèrent pas leur
            propre zone défilante (Tableau de bord, Personnels, Paramètres).
            Le Planning gère la sienne en interne (voir son `Panel`) : dans ce
            cas ce `overflow-y-auto` ne s'active jamais, il n'y a donc jamais
            deux barres de défilement en même temps. `h-screen` + `overflow-
            hidden` sur le conteneur racine (au lieu de `min-h-screen`)
            empêche aussi la page elle-même de dépasser la fenêtre. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-canvas">
          {status === 'loading' ? (
            <p className="py-16 text-center text-body-md text-muted">Chargement du planning…</p>
          ) : status === 'error' ? (
            <LoadError message={loadError} onRetry={() => void load()} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      {showSplash ? <SplashScreen /> : null}

      {/* Instance unique, montée ici plutôt que dans chaque écran : consulter
          une fiche depuis Planning ou Personnels ne doit jamais changer
          l'écran actif dans la nav — juste ouvrir cet overlay par-dessus. */}
      <EmployeeForm
        open={employeeProfile !== null}
        employee={
          employeeProfile?.mode === 'edit'
            ? (employees.find((employee) => employee.id === employeeProfile.id) ?? null)
            : null
        }
        teams={teams}
        usedColors={employees.flatMap((employee) => (employee.colorIndex ? [employee.colorIndex] : []))}
        events={events}
        shifts={shifts}
        onClose={closeEmployeeProfile}
        onSave={upsertEmployee}
      />
    </div>
  )
}

function LoadError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-panel border border-hairline bg-surface-1 px-6 py-12 text-center">
      <IconAlert size={28} className="text-critical-text" />
      <h2 className="text-headline-md text-ink">Planning illisible</h2>
      <p className="text-body-md text-muted">{message}</p>
      <p className="text-body-sm text-faint">
        Le fichier de données est lu par un petit serveur local. Vérifie que l'application a bien
        été lancée avec <code className="text-ink">npm run dev</code> ou{' '}
        <code className="text-ink">npm start</code> — l'ouvrir directement depuis le disque ne
        suffit pas, le navigateur n'aurait alors pas le droit d'écrire.
      </p>
      <Button onClick={onRetry}>Réessayer</Button>
    </div>
  )
}
