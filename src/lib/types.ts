/**
 * Le document de planning — c'est exactement la forme de `data/planning.json`.
 *
 * Un seul document, chargé en entier au démarrage et réécrit en entier à
 * chaque modification. À l'échelle visée (une équipe, quelques centaines de
 * créneaux) le fichier pèse quelques dizaines de Ko : un protocole de
 * différentiel coûterait plus en complexité qu'il ne rapporterait.
 */

export type Id = string

/** Type de contrat. `endDate` n'a de sens que sur les contrats à terme. */
export type ContractType = 'CDI' | 'CDD' | 'Temps partiel' | 'Intérim' | 'Stage' | 'Alternance'

export const CONTRACT_TYPES: ContractType[] = [
  'CDI',
  'CDD',
  'Temps partiel',
  'Intérim',
  'Stage',
  'Alternance',
]

/** Types de contrat à durée déterminée — ceux qui déclenchent l'alerte de fin. */
export const FIXED_TERM_CONTRACTS: ContractType[] = ['CDD', 'Intérim', 'Stage', 'Alternance']

export type EmployeeStatus = 'actif' | 'conges' | 'maladie' | 'inactif'

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  actif: 'Actif',
  conges: 'Congés payés',
  maladie: 'Absence (maladie)',
  inactif: 'Inactif',
}

export interface Contract {
  type: ContractType
  /** Quota hebdomadaire en heures — sert de base au taux d'occupation. */
  weeklyHours: number
  /** Date ISO « AAAA-MM-JJ ». */
  startDate: string
  /** Date ISO « AAAA-MM-JJ ». Absente sur un CDI. */
  endDate?: string
}

export interface Employee {
  id: Id
  firstName: string
  lastName: string
  email?: string
  /** Intitulé du poste, ex. « Infirmière ». */
  role: string
  /** Service de rattachement, ex. « Opérations ». */
  department: string
  teamId: Id | null
  contract: Contract
  status: EmployeeStatus
  /** Sorti des effectifs : masqué partout, mais ses créneaux passés restent. */
  archived: boolean
}

export interface Team {
  id: Id
  name: string
  /** Index 1-8 dans la palette catégorielle (voir lib/palette.ts). */
  colorIndex: number
}

/**
 * Modèle de poste récurrent — la « tranche horaire » des maquettes.
 * Sert de raccourci à la création d'un créneau ; il n'est pas suivi par
 * référence ensuite (voir `Shift`).
 */
export interface ShiftTemplate {
  id: Id
  name: string
  /** « HH:mm ». Si `end` <= `start`, la tranche passe minuit. */
  start: string
  end: string
  /** Pause non travaillée, déduite de la durée comptabilisée. */
  breakMinutes: number
  colorIndex: number
  archived: boolean
}

/**
 * Un créneau posé sur le calendrier.
 *
 * Les horaires sont **copiés** du modèle à la création puis vivent leur vie.
 * C'est délibéré : corriger un modèle ne doit pas réécrire rétroactivement des
 * semaines déjà planifiées et validées.
 */
export interface Shift {
  id: Id
  employeeId: Id
  /** Date ISO « AAAA-MM-JJ » du *début* du créneau. */
  date: string
  /** Modèle d'origine — conservé pour la couleur et le nom, peut être null. */
  templateId: Id | null
  start: string
  end: string
  breakMinutes: number
  /** Nom affiché ; repris du modèle à la création, modifiable ensuite. */
  label: string
  colorIndex: number
  note?: string
}

/** Type d'un événement — ce qui n'est pas du travail planifié. */
export type EventType = 'conges' | 'maladie' | 'maternite' | 'formation' | 'autre'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  conges: 'Congés payés',
  maladie: 'Arrêt maladie',
  maternite: 'Congé maternité/paternité',
  formation: 'Formation',
  autre: 'Autre',
}

/** Teinte de statut réutilisée par les badges — pas la palette catégorielle. */
export const EVENT_TYPE_TONE: Record<EventType, 'neutral' | 'serious' | 'warning'> = {
  conges: 'neutral',
  maladie: 'serious',
  maternite: 'neutral',
  formation: 'warning',
  autre: 'neutral',
}

/**
 * Une absence — congés, maladie, formation… Distincte d'un `Shift` : elle
 * couvre une période (pas un horaire dans une journée) et bloque cette
 * période plutôt que de la remplir.
 */
export interface Event {
  id: Id
  employeeId: Id
  type: EventType
  /** Date ISO « AAAA-MM-JJ » inclusive. */
  startDate: string
  /** Date ISO « AAAA-MM-JJ » inclusive — peut être égale à `startDate`. */
  endDate: string
  note?: string
}

export interface NotificationSettings {
  /** Préavis, en jours, de l'alerte de fin de contrat. */
  contractNoticeDays: number
  /** Tolérance en heures avant de signaler un écart au quota hebdomadaire. */
  hoursTolerance: number
  enabledRules: Record<string, boolean>
  /** Alertes masquées à la main, par identifiant stable de règle+cible. */
  dismissed: string[]
}

export interface Settings {
  /** Jours travaillés, 1 = lundi … 7 = dimanche (ISO). */
  openingDays: number[]
  notifications: NotificationSettings
}

export interface PlanningData {
  version: 1
  employees: Employee[]
  teams: Team[]
  shiftTemplates: ShiftTemplate[]
  shifts: Shift[]
  events: Event[]
  settings: Settings
}

export const fullName = (employee: Employee) => `${employee.firstName} ${employee.lastName}`.trim()

export const initials = (employee: Employee) =>
  `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase()
