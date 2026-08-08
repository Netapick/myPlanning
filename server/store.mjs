import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Accès au fichier de données. C'est le seul endroit de l'application qui
 * touche au disque.
 *
 * Le contrat tenu ici : à aucun moment `planning.json` ne doit se retrouver
 * tronqué ou à moitié écrit. Un plantage au mauvais instant pendant un
 * `writeFile` classique laisserait un JSON invalide et perdrait tout. D'où
 * l'écriture atomique (fichier temporaire puis `rename`, qui est atomique sur
 * un même système de fichiers) et la copie de sauvegarde faite avant chaque
 * écrasement.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DATA_DIR = path.join(ROOT, 'data')
export const DATA_FILE = path.join(DATA_DIR, 'planning.json')
const BACKUP_FILE = path.join(DATA_DIR, 'planning.backup.json')
const EXAMPLE_FILE = path.join(DATA_DIR, 'planning.example.json')
const TEMP_FILE = path.join(DATA_DIR, 'planning.json.tmp')

/** Chemin affiché dans Paramètres > Données, relatif à la racine du projet. */
export const DATA_FILE_LABEL = path.relative(ROOT, DATA_FILE)

/**
 * Les écritures sont sérialisées sur cette chaîne de promesses. Le client
 * envoie un document complet à chaque sauvegarde ; deux requêtes qui se
 * chevauchent pourraient sinon s'entrelacer entre le backup et le rename.
 */
let writeQueue = Promise.resolve()

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validation de forme, pas de contenu : on refuse ce qui casserait l'app au
 * chargement suivant (mauvaise version, tableaux manquants). Le détail des
 * champs est la responsabilité du client, qui est le seul à écrire ici.
 *
 * @returns {string | null} message d'erreur, ou null si le document est sain
 */
export function validateDocument(doc) {
  if (!isPlainObject(doc)) return 'Le document doit être un objet JSON.'
  if (doc.version !== 1) return `Version de document inattendue : ${JSON.stringify(doc.version)}.`
  for (const key of ['employees', 'teams', 'shiftTemplates', 'shifts']) {
    if (!Array.isArray(doc[key])) return `Le champ « ${key} » doit être un tableau.`
  }
  if (!isPlainObject(doc.settings)) return 'Le champ « settings » doit être un objet.'
  return null
}

const toIsoDate = (date) => date.toISOString().slice(0, 10)

/**
 * Résout les dates relatives du jeu de démarrage.
 *
 * `planning.example.json` est commité une fois pour toutes, mais doit produire
 * une première semaine qui a l'air vivante quel que soit le jour de
 * l'installation. Deux jetons, valables uniquement dans ce fichier :
 *
 *   "D0".."D6"  → lundi de la semaine courante + N jours
 *   "+15d"      → aujourd'hui + 15 jours (accepte le négatif : "+-180d")
 *
 * Une fois `planning.json` écrit, ces jetons ont disparu : le fichier de
 * travail ne contient que des dates ISO ordinaires.
 */
const resolveSeedDates = (value) => {
  if (Array.isArray(value)) return value.map(resolveSeedDates)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveSeedDates(item)]),
    )
  }
  if (typeof value !== 'string') return value

  const today = new Date()
  today.setHours(12, 0, 0, 0) // midi : à l'abri des décalages d'heure d'été

  const weekday = value.match(/^D([0-6])$/)
  if (weekday) {
    const monday = new Date(today)
    // getDay() : 0 = dimanche. On ramène au lundi de la semaine en cours.
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + Number(weekday[1]))
    return toIsoDate(monday)
  }

  const offset = value.match(/^\+(-?\d+)d$/)
  if (offset) {
    const shifted = new Date(today)
    shifted.setDate(shifted.getDate() + Number(offset[1]))
    return toIsoDate(shifted)
  }

  return value
}

/** Recharge le jeu d'exemple (dates résolues) — utilisé par Paramètres > Données > Réinitialiser. */
export async function loadExampleDocument() {
  return resolveSeedDates(JSON.parse(await readFile(EXAMPLE_FILE, 'utf8')))
}

/**
 * Lit le document. Au tout premier lancement `planning.json` n'existe pas :
 * on le crée à partir de l'exemple commité, pour que l'app s'ouvre sur des
 * données vivantes plutôt que sur quatre écrans vides.
 */
export async function readDocument() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // JSON corrompu ou droits insuffisants : on remonte l'erreur telle
      // quelle. Écraser le fichier par l'exemple ferait disparaître des
      // données récupérables à la main.
      throw new Error(`Lecture de ${DATA_FILE_LABEL} impossible : ${error.message}`)
    }
    const seed = resolveSeedDates(JSON.parse(await readFile(EXAMPLE_FILE, 'utf8')))
    await writeDocument(seed)
    return seed
  }
}

/** Écrit le document (atomiquement) après avoir mis l'ancien de côté. */
export function writeDocument(doc) {
  const invalid = validateDocument(doc)
  if (invalid) return Promise.reject(new Error(invalid))

  writeQueue = writeQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true })
    try {
      await copyFile(DATA_FILE, BACKUP_FILE)
    } catch (error) {
      // Pas de fichier à sauvegarder au premier lancement : rien d'anormal.
      if (error.code !== 'ENOENT') throw error
    }
    // Indenté à 2 espaces : le fichier doit rester lisible et éditable à la
    // main, c'est une partie de l'intérêt de tout garder dans un JSON.
    await writeFile(TEMP_FILE, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
    await rename(TEMP_FILE, DATA_FILE)
  })

  return writeQueue
}
