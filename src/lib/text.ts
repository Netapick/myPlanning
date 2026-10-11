/**
 * Met une majuscule à chaque mot et passe le reste en minuscules :
 * « jean-pierre DUPONT » → « Jean-Pierre Dupont ». Les espaces, tirets et
 * apostrophes séparent les mots. Les espaces en bordure sont conservés tels
 * quels, pour ne pas gêner la frappe quand c'est appliqué à la perte de focus.
 */
export const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toUpperCase())
