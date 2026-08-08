/**
 * Palette catégorielle — les huit teintes qui identifient les tranches
 * horaires et les équipes.
 *
 * L'ordre est fixe et **jamais recyclé** : la 9e tranche créée reprend la
 * teinte 1, mais le choix reste explicite dans le formulaire, et la couleur
 * n'est jamais le seul porteur de l'information (chaque créneau affiche son
 * nom et ses horaires en toutes lettres). Les valeurs elles-mêmes vivent dans
 * theme.css, où elles sont dérivées pour chaque thème ; ici on ne manipule que
 * des index.
 */

export const PALETTE_SIZE = 8

export const PALETTE_LABELS = [
  'Bleu',
  'Orange',
  'Aqua',
  'Jaune',
  'Magenta',
  'Vert',
  'Violet',
  'Rouge',
] as const

/** Ramène n'importe quel entier dans 1..8, y compris les valeurs héritées. */
export const normalizeColorIndex = (index: number): number => {
  if (!Number.isFinite(index)) return 1
  return ((Math.trunc(index) - 1 + PALETTE_SIZE) % PALETTE_SIZE) + 1
}

/** La variable CSS à poser en `style` — Tailwind ne peut pas générer ces
 *  classes dynamiquement, et une table de correspondance en dur serait un
 *  doublon de plus à maintenir en phase avec theme.css. */
export const colorVar = (index: number) => `var(--cat-${normalizeColorIndex(index)})`

/** Prochaine teinte libre, pour proposer un défaut sensé à la création. */
export const nextColorIndex = (used: number[]): number => {
  for (let i = 1; i <= PALETTE_SIZE; i += 1) {
    if (!used.includes(i)) return i
  }
  return normalizeColorIndex(used.length + 1)
}
