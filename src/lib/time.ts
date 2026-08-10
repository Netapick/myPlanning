/**
 * Arithmétique des horaires. Tout ce qui manipule des « HH:mm » ou compte des
 * heures passe par ici — aucun écran ne refait ce calcul dans son coin.
 *
 * Le cas qui justifie ce module : la tranche « Nuit 22:00 → 06:00 ». Une
 * soustraction naïve donne −16h. Toutes les fonctions ci-dessous traitent
 * `end <= start` comme un passage à minuit.
 */

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

export const isValidTime = (value: string) => HHMM.test(value)

/** « HH:mm » → minutes depuis minuit. Renvoie 0 sur une entrée invalide. */
export const toMinutes = (time: string): number => {
  const match = HHMM.exec(time)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

/** Minutes depuis minuit → « HH:mm », en repliant au-delà de 24h. */
export const toTime = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Durée brute d'un créneau, passage de minuit compris. */
export const spanMinutes = (start: string, end: string): number => {
  const from = toMinutes(start)
  const to = toMinutes(end)
  return to > from ? to - from : to + 1440 - from
}

/** Vrai si le créneau déborde sur le lendemain. */
export const crossesMidnight = (start: string, end: string): boolean =>
  toMinutes(end) <= toMinutes(start)

/** « 8h », « 7h30 » — format compact du design system. */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** « +2h », « -1h30 » — variante signée, pour les soldes RH qui peuvent être négatifs. */
export const formatSignedDuration = (minutes: number): string =>
  `${minutes < 0 ? '-' : '+'}${formatDuration(Math.abs(minutes))}`

/** « 8,5 h » — pour les totaux, où le décimal se compare plus vite. */
export const formatHours = (minutes: number): string => {
  const hours = minutes / 60
  const rounded = Math.round(hours * 10) / 10
  return `${rounded.toLocaleString('fr-FR')} h`
}

/** « 08:00 - 16:00 » */
export const formatRange = (start: string, end: string) => `${start} - ${end}`

/**
 * Intervalle absolu d'un créneau, en minutes depuis minuit le jour `date`.
 * Nécessaire pour détecter les chevauchements : deux créneaux de jours
 * différents peuvent se recouvrir si le premier passe minuit.
 */
export const absoluteSpan = (dayIndex: number, start: string, end: string) => {
  const from = dayIndex * 1440 + toMinutes(start)
  return { from, to: from + spanMinutes(start, end) }
}
