/**
 * Vérification de mise à jour — inspirée de myBank, simplifiée pour myPlanning
 * (pas d'Android/Capacitor : un seul artefact Windows à comparer).
 *
 * Fetch pur vers l'API GitHub Releases, sans `tauri-plugin-updater`. Le CI
 * (`.github/workflows/release.yml`) publie une release taguée `vX.Y.Z` à
 * chaque tag poussé — le tag fait foi, pas besoin de parser un nom de
 * fichier comme myBank (qui publiait pour deux plateformes).
 *
 * Ne doit jamais faire échouer ou bloquer le démarrage de l'app : toute
 * erreur (pas de réseau, API indisponible, réponse inattendue) retombe
 * silencieusement sur `null`, comme si aucune mise à jour n'était disponible.
 */

const REPO = 'Netapick/myPlanning'

export interface AvailableUpdate {
  version: string
  releaseUrl: string
  downloadUrl: string | null
  releaseNotes: string | null
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  body?: string
  assets: { name: string; browser_download_url: string }[]
}

/** `1.2.3` (ou `v1.2.3`) → entier comparable, `null` si le format ne matche pas. */
const parseVersion = (raw: string): number | null => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(raw.trim())
  if (!match) return null
  const [, major, minor, patch] = match
  return Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch)
}

export const checkForUpdate = async (currentVersion: string): Promise<AvailableUpdate | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return null

    const release = (await response.json()) as GitHubRelease
    const latest = parseVersion(release.tag_name)
    const current = parseVersion(currentVersion)
    if (latest === null || current === null || latest <= current) return null

    const installer = release.assets.find((asset) => asset.name.endsWith('-setup.exe'))
    return {
      version: release.tag_name.replace(/^v/, ''),
      releaseUrl: release.html_url,
      downloadUrl: installer?.browser_download_url ?? null,
      releaseNotes: release.body?.trim() || null,
    }
  } catch {
    return null
  }
}
