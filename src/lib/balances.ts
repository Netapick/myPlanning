import { differenceInCalendarDays } from 'date-fns'
import { dateRangesOverlap } from './events'
import { workedMinutes } from './time'
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
 * Équivalent journalier du quota contractuel — même convention que le taux
 * d'occupation du tableau de bord (`useDashboardData.ts`), sur une base de
 * 5 jours pour rester simple : une récupération de jour férié « vaut » une
 * journée-type de la personne.
 */
const dailyContractMinutes = (employee: Employee): number => (employee.contract.weeklyHours * 60) / 5

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
      (minutesByWeek.get(weekStart) ?? 0) + workedMinutes(shift.start, shift.end, shift.breakMinutes),
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
  overtimeRecoveredMinutes: number
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

  const leaveTaken = employeeEvents
    .filter((event) => event.type === 'conges')
    .reduce((total, event) => total + daysCoveredInPeriod(event, period), 0)

  const overtimeAccruedMinutes = accruedOvertimeMinutes(employee, shifts, period)

  const overtimeRecoveredMinutes = employeeEvents
    .filter((event) => event.type === 'ferie')
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
    overtimeRecoveredMinutes,
    overtimeRemainingMinutes: employee.overtimeBalanceMinutes + overtimeAccruedMinutes - overtimeRecoveredMinutes,
    restDaysTaken,
  }
}
