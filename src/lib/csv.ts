/**
 * Export CSV générique, côté client — aucune dépendance, cohérent avec l'app
 * 100% locale. Réutilisable pour d'autres exports futurs.
 */

/** Encadre de guillemets si le champ contient le délimiteur, un retour à la ligne ou un guillemet. */
const escapeField = (value: string, delimiter: string): string => {
  if (value.includes(delimiter) || value.includes('"') || /[\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export const toCsv = (rows: string[][], delimiter = ';'): string =>
  rows.map((row) => row.map((field) => escapeField(field, delimiter)).join(delimiter)).join('\r\n')

/** Déclenche le téléchargement d'un CSV via un lien éphémère — pas de dépendance. */
export const downloadCsv = (filename: string, rows: string[][], delimiter = ';') => {
  // BOM UTF-8 : Excel n'auto-détecte pas l'encodage sans lui et affiche des
  // accents corrompus sinon.
  const blob = new Blob(['﻿' + toCsv(rows, delimiter)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
