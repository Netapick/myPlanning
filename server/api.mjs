import { stat } from 'node:fs/promises'
import {
  DATA_FILE,
  DATA_FILE_LABEL,
  loadExampleDocument,
  readDocument,
  writeDocument,
} from './store.mjs'

/**
 * L'API de persistance : partagée à l'identique par le serveur de
 * développement (via vite-plugin-local-store.ts) et par le serveur autonome
 * (server/index.mjs). Les deux modes de lancement doivent se comporter
 * exactement pareil — d'où ce module commun plutôt que deux copies.
 *
 *   GET  /api/data   →  { document, file, savedAt }
 *   PUT  /api/data   →  { file, savedAt }
 *   POST /api/reset  →  { document, file, savedAt }  (remplace par le jeu d'exemple)
 */

/** Garde-fou : un planning réaliste pèse quelques dizaines de Ko. */
const MAX_BODY_BYTES = 8 * 1024 * 1024

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    // Les données changent à chaque sauvegarde : jamais de cache, sinon un
    // rechargement d'onglet peut ressusciter un état périmé.
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Document trop volumineux.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

/** Date de dernière écriture du fichier, pour l'indicateur de sauvegarde. */
const lastSavedAt = async () => {
  try {
    return (await stat(DATA_FILE)).mtime.toISOString()
  } catch {
    return null
  }
}

/**
 * @returns {Promise<boolean>} true si la requête a été prise en charge.
 */
export async function handleApiRequest(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (url.pathname === '/api/reset') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: `Méthode ${req.method} non supportée sur /api/reset.` })
      return true
    }
    try {
      const document = await loadExampleDocument()
      await writeDocument(document)
      sendJson(res, 200, { document, file: DATA_FILE_LABEL, savedAt: await lastSavedAt() })
    } catch (error) {
      sendJson(res, 500, { error: error.message })
    }
    return true
  }

  if (url.pathname !== '/api/data') return false

  try {
    if (req.method === 'GET') {
      const document = await readDocument()
      sendJson(res, 200, { document, file: DATA_FILE_LABEL, savedAt: await lastSavedAt() })
      return true
    }

    if (req.method === 'PUT') {
      const raw = await readBody(req)
      let document
      try {
        document = JSON.parse(raw)
      } catch {
        sendJson(res, 400, { error: 'Corps de requête JSON invalide.' })
        return true
      }
      await writeDocument(document)
      sendJson(res, 200, { file: DATA_FILE_LABEL, savedAt: await lastSavedAt() })
      return true
    }

    sendJson(res, 405, { error: `Méthode ${req.method} non supportée sur /api/data.` })
    return true
  } catch (error) {
    // Le message remonte tel quel jusqu'à l'indicateur de sauvegarde de
    // l'interface : sur un outil local, savoir *pourquoi* l'écriture a échoué
    // (disque plein, droits, JSON refusé) vaut mieux qu'un « erreur ».
    sendJson(res, 500, { error: error.message })
    return true
  }
}
