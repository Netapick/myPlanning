import type { Plugin } from 'vite'
// @ts-expect-error — server/ est du JS pur, volontairement hors type-check
// (voir tsconfig.node.json) : il doit rester lançable par `node` sans build.
import { handleApiRequest } from './server/api.mjs'

/**
 * Greffe l'API de persistance sur le serveur de développement Vite.
 *
 * C'est la pièce qui rend le stockage « juste un fichier JSON dans le dossier
 * du projet » réalisable : un navigateur sait lire ce fichier tout seul, mais
 * aucune page web n'a le droit de réécrire un fichier du disque. Ce middleware
 * est le petit bout de Node qui accepte l'écriture, et il tourne dans le
 * processus qu'on lance déjà pour l'app — rien de plus à démarrer.
 */
export function localStorePlugin(): Plugin {
  return {
    name: 'myplanning-local-store',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleApiRequest(req, res).then((handled: boolean) => {
          if (!handled) next()
        })
      })
    },
    // `vite preview` sert le build de production : sans ça, tester le build
    // localement casserait la sauvegarde de façon déroutante.
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleApiRequest(req, res).then((handled: boolean) => {
          if (!handled) next()
        })
      })
    },
  }
}
