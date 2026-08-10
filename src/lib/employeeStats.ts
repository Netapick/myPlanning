import { subMonths } from 'date-fns'
import { currentYearPeriod, daysCoveredInPeriod, type Period } from './balances'
import { publicHolidaysForYear } from './holidays'
import { colorVar } from './palette'
import { spanMinutes } from './time'
import { EVENT_TYPE_COLOR_INDEX, EVENT_TYPE_LABELS } from './types'
import type { Employee, Event, EventType, Shift } from './types'
import { startOfIsoWeek, toIso, weekNumber } from './week'

/**
 * Agrégations pour les graphiques de la fiche employé (mode « Affichage
 * avancé »). Tout est recalculé à la volée depuis `shifts`/`events` déjà en
 * mémoire — rien n'est stocké, même principe que `lib/balances.ts`.
 */

export interface WeeklyHoursPoint {
  /** « S42 » — étiquette d'axe. */
  label: string
  /** Lundi ISO de la semaine, pour trier chronologiquement. */
  weekStart: string
  hours: number
}

/** Heures travaillées par semaine ISO, sur les `monthsBack` derniers mois. */
export const weeklyHoursForEmployee = (
  employee: Employee,
  shifts: Shift[],
  monthsBack = 3,
): WeeklyHoursPoint[] => {
  const since = toIso(subMonths(new Date(), monthsBack))
  const totals = new Map<string, number>()

  for (const shift of shifts) {
    if (shift.employeeId !== employee.id || shift.date < since) continue
    const weekStart = toIso(startOfIsoWeek(new Date(`${shift.date}T12:00:00`)))
    totals.set(
      weekStart,
      (totals.get(weekStart) ?? 0) + spanMinutes(shift.start, shift.end),
    )
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, minutes]) => ({
      label: `S${weekNumber(new Date(`${weekStart}T12:00:00`))}`,
      weekStart,
      hours: Math.round((minutes / 60) * 10) / 10,
    }))
}

export interface EventTypeBreakdownPoint {
  type: EventType
  label: string
  days: number
  color: string
}

const OTHER_COLOR = 'var(--border-strong)'

/** Répartition des jours d'événements de la personne par type, sur `period`. */
export const eventTypeBreakdown = (
  employee: Employee,
  events: Event[],
  period: Period = currentYearPeriod(),
): EventTypeBreakdownPoint[] => {
  const totals = new Map<EventType, number>()
  for (const event of events) {
    if (event.employeeId !== employee.id) continue
    const days = daysCoveredInPeriod(event, period)
    if (days <= 0) continue
    totals.set(event.type, (totals.get(event.type) ?? 0) + days)
  }

  return [...totals.entries()]
    .map(([type, days]) => ({
      type,
      label: EVENT_TYPE_LABELS[type],
      days,
      color: type === 'autre' ? OTHER_COLOR : colorVar(EVENT_TYPE_COLOR_INDEX[type]),
    }))
    .sort((a, b) => b.days - a.days)
}

export interface HolidayWorkSummary {
  worked: number
  notWorked: number
  total: number
}

/** Jours fériés `year` travaillés (un shift ce jour-là) vs chômés, pour la personne. */
export const holidayWorkSummary = (
  employee: Employee,
  shifts: Shift[],
  year = new Date().getFullYear(),
): HolidayWorkSummary => {
  const holidays = publicHolidaysForYear(year)
  const workedDates = new Set(
    shifts.filter((shift) => shift.employeeId === employee.id).map((shift) => shift.date),
  )
  const worked = holidays.filter((holiday) => workedDates.has(holiday.date)).length
  return { worked, notWorked: holidays.length - worked, total: holidays.length }
}
