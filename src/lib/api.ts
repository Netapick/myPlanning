import type { PlanningData } from './types'

/**
 * Le seul lien entre l'interface et le fichier de données.
 *
 * Deux modes d'exécution, deux implémentations, même interface :
 *
 * - **Navigateur** (`npm run dev`, `npm start`) — le navigateur sait lire un
 *   fichier local, mais pas le réécrire. Le `PUT` passe par un middleware Node
 *   (`vite-plugin-local-store.ts` en dev, `server/index.mjs` en autonome),
 *   seul autorisé à toucher le disque.
 * - **Desktop** (`npm run tauri:build`) — pas de serveur HTTP embarqué : les
 *   mêmes opérations passent par des commandes Rust (`src-tauri/src/commands.rs`),
 *   invoquées via l'API `invoke` de Tauri.
 *
 * Aucun écran ne doit savoir dans quel mode il tourne : ils importent tous
 * `loadDocument`/`saveDocument`/`resetDocument` d'ici, jamais `fetch` ou
 * `invoke` directement.
 */

export interface LoadResult {
  document: PlanningData
  /** Nom du fichier, affiché dans Paramètres > Données. */
  file: string
  savedAt: string | null
}

export interface SaveResult {
  file: string
  savedAt: string | null
}

/**
 * Résultat de « Exporter en JSON » (Paramètres > Données) — trois issues
 * distinctes : desktop réussi (on connaît le chemin exact choisi dans la
 * boîte de dialogue), desktop annulé (rien à dire à l'utilisateur), ou web
 * (le navigateur choisit seul l'emplacement, jamais connu côté JS).
 */
export type ExportOutcome =
  | { status: 'saved'; path: string }
  | { status: 'cancelled' }
  | { status: 'downloaded' }

/** Présent uniquement quand l'app tourne dans la coquille desktop Tauri. */
export const isTauri = (): boolean => '__TAURI_INTERNALS__' in window

const parseError = async (response: Response, fallback: string): Promise<never> => {
  let detail = ''
  try {
    const body = (await response.json()) as { error?: string }
    detail = body.error ?? ''
  } catch {
    // Réponse non-JSON (le serveur n'a pas démarré, un proxy s'est intercalé) :
    // le statut HTTP est alors la seule information exploitable.
  }
  throw new Error(detail || `${fallback} (HTTP ${response.status})`)
}

// --- Mode navigateur : HTTP vers le middleware local -----------------------

const loadDocumentHttp = async (): Promise<LoadResult> => {
  const response = await fetch('/api/data', { headers: { Accept: 'application/json' } })
  if (!response.ok) await parseError(response, 'Chargement impossible')
  return (await response.json()) as LoadResult
}

const saveDocumentHttp = async (document: PlanningData): Promise<SaveResult> => {
  const response = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  })
  if (!response.ok) await parseError(response, 'Sauvegarde impossible')
  return (await response.json()) as SaveResult
}

const resetDocumentHttp = async (): Promise<LoadResult> => {
  const response = await fetch('/api/reset', { method: 'POST' })
  if (!response.ok) await parseError(response, 'Réinitialisation impossible')
  return (await response.json()) as LoadResult
}

// --- Mode desktop : commandes Tauri -----------------------------------------

const loadDocumentTauri = async (): Promise<LoadResult> => {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<LoadResult>('load_document')
}

const saveDocumentTauri = async (document: PlanningData): Promise<SaveResult> => {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<SaveResult>('save_document', { document })
}

const resetDocumentTauri = async (): Promise<LoadResult> => {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<LoadResult>('reset_document')
}

const exportDocumentTauri = async (document: PlanningData, name: string): Promise<ExportOutcome> => {
  const { invoke } = await import('@tauri-apps/api/core')
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({ defaultPath: name, filters: [{ name: 'JSON', extensions: ['json'] }] })
  if (!path) return { status: 'cancelled' }
  await invoke('export_document', { document, path })
  return { status: 'saved', path }
}

const exportTextTauri = async (
  content: string,
  name: string,
  filter: { name: string; extension: string },
): Promise<ExportOutcome> => {
  const { invoke } = await import('@tauri-apps/api/core')
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({ defaultPath: name, filters: [{ name: filter.name, extensions: [filter.extension] }] })
  if (!path) return { status: 'cancelled' }
  await invoke('export_text', { content, path })
  return { status: 'saved', path }
}

// --- Mode navigateur : téléchargement blob ----------------------------------
// Un vrai navigateur ne dit jamais à la page où il a enregistré le fichier —
// seul le mode desktop (boîte de dialogue Tauri ci-dessus) connaît le chemin.

const exportDocumentWeb = (document: PlanningData, name: string): ExportOutcome => {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
  return { status: 'downloaded' }
}

// --- Dispatch ----------------------------------------------------------------

export const loadDocument = (): Promise<LoadResult> =>
  isTauri() ? loadDocumentTauri() : loadDocumentHttp()

export const saveDocument = (document: PlanningData): Promise<SaveResult> =>
  isTauri() ? saveDocumentTauri(document) : saveDocumentHttp(document)

export const resetDocument = (): Promise<LoadResult> =>
  isTauri() ? resetDocumentTauri() : resetDocumentHttp()

const exportTextWeb = (content: string, name: string, mime: string): ExportOutcome => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = window.document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
  return { status: 'downloaded' }
}

/** Enregistre un texte (CSV…) : boîte « Enregistrer sous » en desktop, téléchargement en navigateur. */
export const exportText = (
  content: string,
  name: string,
  filter: { name: string; extension: string; mime: string },
): Promise<ExportOutcome> =>
  isTauri() ? exportTextTauri(content, name, filter) : Promise.resolve(exportTextWeb(content, name, filter.mime))

export const exportDocument = (document: PlanningData, name: string): Promise<ExportOutcome> =>
  isTauri() ? exportDocumentTauri(document, name) : Promise.resolve(exportDocumentWeb(document, name))
