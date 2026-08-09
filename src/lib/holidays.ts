import { addDays } from 'date-fns'
import { toIso } from './week'

/**
 * Jours fériés légaux français — calcul 100% local, aucun réseau ni base à
 * télécharger : huit dates fixes plus trois dates mobiles dérivées de Pâques
 * (calculé par l'algorithme de Gauss, valable sur n'importe quelle année).
 */

/** Dimanche de Pâques (algorithme de Gauss) pour une année donnée. */
const easterSunday = (year: number): Date => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const fixedHolidays = (year: number): { date: string; name: string }[] => [
  { date: toIso(new Date(year, 0, 1)), name: 'Jour de l’An' },
  { date: toIso(new Date(year, 4, 1)), name: 'Fête du Travail' },
  { date: toIso(new Date(year, 4, 8)), name: 'Victoire 1945' },
  { date: toIso(new Date(year, 6, 14)), name: 'Fête nationale' },
  { date: toIso(new Date(year, 7, 15)), name: 'Assomption' },
  { date: toIso(new Date(year, 10, 1)), name: 'Toussaint' },
  { date: toIso(new Date(year, 10, 11)), name: 'Armistice 1918' },
  { date: toIso(new Date(year, 11, 25)), name: 'Noël' },
]

const movableHolidays = (year: number): { date: string; name: string }[] => {
  const easter = easterSunday(year)
  return [
    { date: toIso(addDays(easter, 1)), name: 'Lundi de Pâques' },
    { date: toIso(addDays(easter, 39)), name: 'Ascension' },
    { date: toIso(addDays(easter, 50)), name: 'Lundi de Pentecôte' },
  ]
}

/** Les 11 jours fériés de l'année, avec leur libellé. */
export const publicHolidaysForYear = (year: number): { date: string; name: string }[] => [
  ...fixedHolidays(year),
  ...movableHolidays(year),
]

const cache = new Map<number, Map<string, string>>()

const holidayMapForYear = (year: number): Map<string, string> => {
  let map = cache.get(year)
  if (!map) {
    map = new Map(publicHolidaysForYear(year).map((holiday) => [holiday.date, holiday.name]))
    cache.set(year, map)
  }
  return map
}

/** Nom du jour férié tombant sur `dateIso` (« AAAA-MM-JJ »), ou `null` sinon. */
export const publicHolidayName = (dateIso: string): string | null => {
  const year = Number(dateIso.slice(0, 4))
  if (!Number.isFinite(year)) return null
  return holidayMapForYear(year).get(dateIso) ?? null
}

export const isPublicHoliday = (dateIso: string): boolean => publicHolidayName(dateIso) !== null
