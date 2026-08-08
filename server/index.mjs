import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApiRequest } from './api.mjs'

/**
 * Serveur autonome : sert le build de `dist/` et la même API de persistance
 * que le mode développement. C'est le point d'entrée « usage quotidien » une
 * fois l'app construite (`npm run build && npm start`), sans outillage Vite.
 *
 * Écoute sur 127.0.0.1 uniquement, jamais sur 0.0.0.0 : l'app n'a ni compte ni
 * mot de passe, elle ne doit donc pas être joignable depuis le réseau local.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

/** Résout une URL en fichier de `dist/`, en refusant toute sortie du dossier. */
const resolveAsset = (pathname) => {
  const candidate = path.join(DIST, path.normalize(decodeURIComponent(pathname)))
  return candidate.startsWith(DIST) ? candidate : null
}

const serveFile = (res, file) => {
  const type = MIME[path.extname(file)] ?? 'application/octet-stream'
  // Les noms de fichiers produits par Vite portent un hash, sauf index.html
  // qui doit toujours être rechargé pour pointer vers le dernier build.
  const cache = path.basename(file) === 'index.html' ? 'no-store' : 'max-age=31536000, immutable'
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache })
  createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  void (async () => {
    if (await handleApiRequest(req, res)) return

    const { pathname } = new URL(req.url ?? '/', `http://${HOST}`)
    const asset = resolveAsset(pathname)

    if (asset) {
      try {
        if ((await stat(asset)).isFile()) {
          serveFile(res, asset)
          return
        }
      } catch {
        // Pas un fichier : on retombe sur index.html ci-dessous.
      }
    }

    // Application monopage : toute route inconnue rend index.html, c'est le
    // routeur côté client qui décide quoi afficher.
    const index = path.join(DIST, 'index.html')
    try {
      await stat(index)
      serveFile(res, index)
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end("dist/ est introuvable. Lance `npm run build` d'abord.\n")
    }
  })()
})

server.listen(PORT, HOST, () => {
  console.log(`myPlanning — http://${HOST}:${PORT}`)
})
