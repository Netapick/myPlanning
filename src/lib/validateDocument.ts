/**
 * Même contrat que `server/store.mjs` côté client : validation de forme,
 * pas de contenu. Utilisée uniquement au moment d'importer un fichier
 * exporté — le serveur revalidera de toute façon à l'écriture, mais un
 * message d'erreur immédiat évite d'envoyer un PUT voué à échouer.
 */
export function validateDocumentShape(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'Le fichier doit contenir un objet JSON.'
  }
  const doc = value as Record<string, unknown>
  if (doc.version !== 1) return `Version de document inattendue : ${JSON.stringify(doc.version)}.`
  for (const key of ['employees', 'teams', 'shiftTemplates', 'shifts', 'events']) {
    if (!Array.isArray(doc[key])) return `Le champ « ${key} » doit être un tableau.`
  }
  if (typeof doc.settings !== 'object' || doc.settings === null) {
    return 'Le champ « settings » doit être un objet.'
  }
  return null
}
