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

// --- Dispatch ----------------------------------------------------------------

export const loadDocument = (): Promise<LoadResult> =>
  isTauri() ? loadDocumentTauri() : loadDocumentHttp()

export const saveDocument = (document: PlanningData): Promise<SaveResult> =>
  isTauri() ? saveDocumentTauri(document) : saveDocumentHttp(document)

export const resetDocument = (): Promise<LoadResult> =>
  isTauri() ? resetDocumentTauri() : resetDocumentHttp()
