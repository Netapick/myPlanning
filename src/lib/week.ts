import { addDays, format, isSameMonth, parseISO, setISOWeek, startOfISOWeek, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Repères de calendrier. La semaine commence le lundi (norme ISO, et la seule
 * lecture naturelle d'un planning de travail en France) — c'est posé ici une
 * fois pour toutes plutôt que répété à chaque appel de date-fns.
 */

const WEEK_OPTIONS = { weekStartsOn: 1, locale: fr } as const

/** « AAAA-MM-JJ » — le format de date utilisé dans tout le document. */
export const toIso = (date: Date) => format(date, 'yyyy-MM-dd')

export const fromIso = (iso: string) => parseISO(iso)

export const startOfIsoWeek = (date: Date) => startOfWeek(date, WEEK_OPTIONS)

/** Les sept dates de la semaine contenant `date`, du lundi au dimanche. */
export const weekDays = (date: Date): Date[] => {
  const monday = startOfIsoWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

/** Jour ISO : 1 = lundi … 7 = dimanche (`getDay()` renvoie 0 pour dimanche). */
export const isoWeekday = (date: Date) => ((date.getDay() + 6) % 7) + 1

/** « LUN » — en-tête de colonne de la grille. */
export const shortDayLabel = (date: Date) => format(date, 'EEE', { locale: fr }).toUpperCase()

/** « 12 oct. » — sous-titre de colonne. */
export const shortDateLabel = (date: Date) => format(date, 'd MMM', { locale: fr })

/** « lundi 12 octobre » — titres et infobulles. */
export const longDateLabel = (date: Date) => format(date, 'EEEE d MMMM', { locale: fr })

/**
 * « Semaine du 12 au 18 octobre 2026 », en évitant de répéter le mois quand
 * la semaine n'en franchit pas la frontière.
 */
export const weekLabel = (date: Date): string => {
  const monday = startOfIsoWeek(date)
  const sunday = addDays(monday, 6)
  const from = isSameMonth(monday, sunday)
    ? format(monday, 'd', { locale: fr })
    : format(monday, 'd MMMM', { locale: fr })
  return `Semaine du ${from} au ${format(sunday, 'd MMMM yyyy', { locale: fr })}`
}

/** Numéro de semaine ISO, affiché à côté de la navigation. */
export const weekNumber = (date: Date) => Number(format(date, 'I', { locale: fr }))

/** « 2026-W42 » — valeur d'un `<input type="week">`. */
export const isoWeekValue = (date: Date) => format(date, "RRRR-'W'II")

/** Lundi de la semaine ISO désignée par une valeur `<input type="week">`, ou `null` si invalide. */
export const fromIsoWeekValue = (value: string): Date | null => {
  const match = /^(\d{4})-W(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearStr, weekStr] = match
  const year = Number(yearStr)
  const week = Number(weekStr)
  if (week < 1 || week > 53) return null
  // Le 4 janvier tombe toujours dans la semaine 1 de sa propre année ISO
  // (définition ISO 8601) — un point de départ fiable pour atteindre n'importe
  // quelle semaine de `year` via `setISOWeek`.
  return startOfISOWeek(setISOWeek(new Date(year, 0, 4), week))
}

/** « 2026-10 » — valeur d'un `<input type="month">`. */
export const isoMonthValue = (date: Date) => format(date, 'yyyy-MM')

/** 1er jour du mois désigné par une valeur `<input type="month">`, ou `null` si invalide. */
export const fromIsoMonthValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearStr, monthStr] = match
  const month = Number(monthStr)
  if (month < 1 || month > 12) return null
  return new Date(Number(yearStr), month - 1, 1)
}

/** « Octobre 2026 » — étiquette du mois affiché. */
export const monthLabel = (date: Date) => format(date, 'MMMM yyyy', { locale: fr })

export const isToday = (date: Date) => toIso(date) === toIso(new Date())

/** Nombre de jours (entier, signé) entre aujourd'hui et une date ISO. */
export const daysFromToday = (iso: string): number => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const target = fromIso(iso)
  target.setHours(12, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
