import type { Employee, EmployeeStatus, Event, EventType } from './types'

/**
 * Utilitaires sur les événements (absences). Un événement couvre une période
 * inclusive de dates ISO — pas d'horaire, contrairement à un `Shift`.
 */

/** Vrai si `date` (ISO) tombe dans la période de l'événement, bornes incluses. */
export const eventCoversDate = (event: Event, date: string): boolean =>
  date >= event.startDate && date <= event.endDate

/** Vrai si deux périodes [a,b] et [c,d] se recouvrent, ne serait-ce qu'un jour. */
export const dateRangesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean => aStart <= bEnd && bStart <= aEnd

/** L'événement en cours pour cette personne à cette date, s'il y en a un. */
export const activeEventFor = (
  events: Event[],
  employeeId: string,
  date: string,
): Event | undefined =>
  events.find((event) => event.employeeId === employeeId && eventCoversDate(event, date))

/**
 * Statut dérivé d'une personne à une date donnée : un événement en cours
 * (congés, maladie, maternité) l'emporte sur son statut de fiche. Un
 * événement « formation » ou « autre » ne change pas le statut — la personne
 * reste comptée comme active, seule son planning du jour est bloqué.
 */
const EVENT_TYPE_TO_STATUS: Partial<Record<EventType, EmployeeStatus>> = {
  conges: 'conges',
  maladie: 'maladie',
  maternite: 'conges',
}

export const derivedStatus = (
  employee: Employee,
  events: Event[],
  date: string,
): EmployeeStatus => {
  if (employee.status === 'inactif') return 'inactif'
  const active = activeEventFor(events, employee.id, date)
  if (!active) return employee.status
  return EVENT_TYPE_TO_STATUS[active.type] ?? employee.status
}
