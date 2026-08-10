import { differenceInCalendarDays } from 'date-fns'
import { dateRangesOverlap } from './events'
import { isPublicHoliday } from './holidays'
import { spanMinutes } from './time'
import { fromIso, startOfIsoWeek, toIso } from './week'
import type { Employee, Event, Shift } from './types'

/**
 * Soldes RH d'une personne — CP, heures sup., repos — calculés à la volée
 * depuis ses créneaux et événements. Rien n'est stocké : seuls
 * `leaveBalance.accrued` et `overtimeBalanceMinutes` (les points de départ,
 * ajustés à la main sur la fiche) sont persistés, le reste se déduit des
 * `Shift`/`Event` posés.
 */

export interface Period {
  /** Date ISO « AAAA-MM-JJ » inclusive. */
  start: string
  end: string
}

/** Année civile en cours — période par défaut des calculs de solde. */
export const currentYearPeriod = (reference = new Date()): Period => {
  const year = reference.getFullYear()
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

/** Jours (inclusifs) de l'événement qui tombent dans `period`, 0 s'il n'y en a aucun. */
export const daysCoveredInPeriod = (event: Event, period: Period): number => {
  const start = event.startDate > period.start ? event.startDate : period.start
  const end = event.endDate < period.end ? event.endDate : period.end
  if (start > end) return 0
  return differenceInCalendarDays(fromIso(end), fromIso(start)) + 1
}

/**
 * Équivalent journalier du quota contractuel — une « journée-type » de la
 * personne, utilisée pour les récupérations comptées en jours entiers
 * (`recup_ferie`) plutôt qu'en plage horaire précise (`recup_hs`).
 */
const dailyContractMinutes = (employee: Employee): number => (employee.contract.weeklyHours * 60) / 5

/**
 * Minutes exactes couvertes par un événement `recup_hs` : sa plage horaire
 * réelle (`start`/`end`), ou repli sur la moyenne contractuelle si elle n'a
 * pas été saisie (défensif — le formulaire l'exige normalement pour ce type).
 */
const eventRecoveryMinutes = (event: Event, employee: Employee): number =>
  event.start && event.end ? spanMinutes(event.start, event.end) : dailyContractMinutes(employee)

/**
 * Crédit automatique pour les jours fériés travaillés : croise les `Shift`
 * posés sur `period` avec le calendrier des jours fériés (`lib/holidays.ts`)
 * — aucun événement à créer à la main, le crédit apparaît dès qu'un créneau
 * est planifié un jour férié détecté.
 */
const holidayShiftCreditMinutes = (employee: Employee, shifts: Shift[], period: Period): number => {
  let total = 0
  for (const shift of shifts) {
    if (shift.employeeId !== employee.id) continue
    if (shift.date < period.start || shift.date > period.end) continue
    if (!isPublicHoliday(shift.date)) continue
    total += spanMinutes(shift.start, shift.end)
  }
  return total
}

/**
 * Cumul automatique des heures sup. : pour chaque semaine ISO travaillée sur
 * `period`, le dépassement (jamais le manque — être sous le quota une
 * semaine ne retire rien) entre les heures planifiées et le quota
 * hebdomadaire du contrat. Même définition du dépassement que l'indicateur
 * « Sup. +Xh » de la grille et l'alerte « overtime » des notifications —
 * juste recalculée sur tout l'historique plutôt que la seule semaine
 * affichée, pour que le solde ne « réinitialise » pas d'une semaine à
 * l'autre.
 */
const accruedOvertimeMinutes = (employee: Employee, shifts: Shift[], period: Period): number => {
  const quota = employee.contract.weeklyHours * 60
  const minutesByWeek = new Map<string, number>()

  for (const shift of shifts) {
    if (shift.employeeId !== employee.id) continue
    if (shift.date < period.start || shift.date > period.end) continue
    const weekStart = toIso(startOfIsoWeek(fromIso(shift.date)))
    minutesByWeek.set(
      weekStart,
      (minutesByWeek.get(weekStart) ?? 0) + spanMinutes(shift.start, shift.end),
    )
  }

  let total = 0
  for (const minutes of minutesByWeek.values()) {
    if (minutes > quota) total += minutes - quota
  }
  return total
}

export interface EmployeeBalances {
  leaveAccrued: number
  leaveTaken: number
  leaveRemaining: number
  /** Solde de départ, ajusté à la main sur la fiche employé. */
  overtimeBalanceMinutes: number
  /** Cumulé automatiquement depuis les semaines en dépassement (voir `accruedOvertimeMinutes`). */
  overtimeAccruedMinutes: number
  /** Crédit automatique pour les jours fériés travaillés (voir `holidayShiftCreditMinutes`). */
  overtimeHolidayCreditMinutes: number
  /** Temps de récupération heures sup. déjà pris (événements `recup_hs`). */
  overtimeRecoveredMinutes: number
  /** Jours de récupération de jour férié déjà pris (événements `recup_ferie`). */
  holidayRecoveryMinutes: number
  overtimeRemainingMinutes: number
  restDaysTaken: number
}

/** Tous les soldes d'une personne sur `period` (l'année en cours par défaut). */
export const employeeBalances = (
  employee: Employee,
  events: Event[],
  shifts: Shift[],
  period: Period = currentYearPeriod(),
): EmployeeBalances => {
  const employeeEvents = events.filter((event) => event.employeeId === employee.id)
  const inPeriod = (event: Event) => event.startDate >= period.start && event.startDate <= period.end

  const leaveTaken = employeeEvents
    .filter((event) => event.type === 'conges')
    .reduce((total, event) => total + daysCoveredInPeriod(event, period), 0)

  const overtimeAccruedMinutes = accruedOvertimeMinutes(employee, shifts, period)
  const overtimeHolidayCreditMinutes = holidayShiftCreditMinutes(employee, shifts, period)

  // Temps de récupération heures sup. réellement pris (plage horaire exacte).
  const overtimeRecoveredMinutes = employeeEvents
    .filter((event) => event.type === 'recup_hs' && inPeriod(event))
    .reduce((total, event) => total + eventRecoveryMinutes(event, employee), 0)

  // Jour(s) de récupération de jour férié pris — décompte en journées-type
  // (pas en plage horaire précise, voir `recup_hs` pour ce cas), répété pour
  // chaque jour couvert par l'événement. La pause compte comme du temps
  // travaillé, donc n'est jamais déduite ici.
  const holidayRecoveryMinutes = employeeEvents
    .filter((event) => event.type === 'recup_ferie')
    .reduce((total, event) => total + daysCoveredInPeriod(event, period) * dailyContractMinutes(employee), 0)

  const restDaysTaken = employeeEvents.filter(
    (event) => event.type === 'repos' && dateRangesOverlap(event.startDate, event.endDate, period.start, period.end),
  ).length

  return {
    leaveAccrued: employee.leaveBalance.accrued,
    leaveTaken,
    leaveRemaining: employee.leaveBalance.accrued - leaveTaken,
    overtimeBalanceMinutes: employee.overtimeBalanceMinutes,
    overtimeAccruedMinutes,
    overtimeHolidayCreditMinutes,
    overtimeRecoveredMinutes,
    holidayRecoveryMinutes,
    overtimeRemainingMinutes:
      employee.overtimeBalanceMinutes +
      overtimeAccruedMinutes +
      overtimeHolidayCreditMinutes -
      overtimeRecoveredMinutes -
      holidayRecoveryMinutes,
    restDaysTaken,
  }
}
