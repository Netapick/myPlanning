import type { PlanningData } from './types'

/**
 * Le seul lien entre l'interface et `data/planning.json`.
 *
 * Le navigateur sait lire un fichier local, mais pas le réécrire : le `PUT`
 * ci-dessous est servi par un middleware Node (vite-plugin-local-store.ts en
 * développement, server/index.mjs en autonome), qui est la seule chose
 * autorisée à toucher le disque.
 */

export interface LoadResult {
  document: PlanningData
  /** Chemin du fichier, affiché dans Paramètres > Données. */
  file: string
  savedAt: string | null
}

export interface SaveResult {
  file: string
  savedAt: string | null
}

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

export const loadDocument = async (): Promise<LoadResult> => {
  const response = await fetch('/api/data', { headers: { Accept: 'application/json' } })
  if (!response.ok) await parseError(response, 'Chargement impossible')
  return (await response.json()) as LoadResult
}

export const saveDocument = async (document: PlanningData): Promise<SaveResult> => {
  const response = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  })
  if (!response.ok) await parseError(response, 'Sauvegarde impossible')
  return (await response.json()) as SaveResult
}
