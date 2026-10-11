import { exportText } from './api'

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

/** Enregistre un CSV — boîte « Enregistrer sous » en desktop (un lien de
 *  téléchargement ne fait rien dans la fenêtre Tauri), téléchargement en navigateur. */
export const saveCsv = (filename: string, rows: string[][], delimiter = ';') =>
  // BOM UTF-8 : Excel n'auto-détecte pas l'encodage sans lui et affiche des
  // accents corrompus sinon.
  exportText('﻿' + toCsv(rows, delimiter), filename, {
    name: 'CSV',
    extension: 'csv',
    mime: 'text/csv;charset=utf-8;',
  })
