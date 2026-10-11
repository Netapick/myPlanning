import { useState } from 'react'
import { IconButton } from '@/components/ui/Button'
import { IconClose, IconDownload } from '@/components/ui/icons'
import { isTauri } from '@/lib/api'
import type { AvailableUpdate } from '@/lib/appUpdate'

type Phase = 'idle' | 'downloading' | 'installing' | 'error'

/**
 * Bannière de mise à jour disponible — check fait au démarrage (voir
 * `AppShell.tsx`), pas un widget à aller consulter dans Paramètres. État
 * local au shell, non persisté : réapparaît tant que la version n'a pas
 * changé, mais reste masquable pour la session en cours.
 *
 * Sur le desktop, le bouton télécharge et installe directement (plugin
 * updater de Tauri : la signature de l'archive est vérifiée avant
 * installation), puis relance l'app. En navigateur, il ouvre simplement la
 * page de téléchargement.
 */
export function UpdateBanner({ update, onDismiss }: { update: AvailableUpdate; onDismiss: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [percent, setPercent] = useState<number | null>(null)
  const [error, setError] = useState('')

  const install = async () => {
    setError('')
    if (!isTauri()) {
      window.open(update.downloadUrl ?? update.releaseUrl, '_blank', 'noopener')
      return
    }
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const { relaunch } = await import('@tauri-apps/plugin-process')
      const found = await check()
      if (!found) {
        setPhase('error')
        setError('Mise à jour introuvable pour le moment — réessaie plus tard.')
        return
      }
      setPhase('downloading')
      let total = 0
      let received = 0
      await found.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0
        else if (event.event === 'Progress') {
          received += event.data.chunkLength
          if (total > 0) setPercent(Math.min(100, Math.round((received / total) * 100)))
        } else if (event.event === 'Finished') setPhase('installing')
      })
      await relaunch()
    } catch (cause) {
      setPhase('error')
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const busy = phase === 'downloading' || phase === 'installing'

  return (
    <div className="flex items-center gap-3 border-b border-accent/30 bg-accent-soft px-4 py-2.5 text-body-sm sm:px-canvas">
      <IconDownload size={16} className="shrink-0 text-accent" aria-hidden="true" />
      <p className="flex-1 text-ink" role="status">
        {phase === 'downloading' ? (
          <>Téléchargement de la v{update.version}{percent !== null ? ` — ${percent} %` : '…'}</>
        ) : phase === 'installing' ? (
          <>Installation de la v{update.version}… l'application va redémarrer.</>
        ) : phase === 'error' ? (
          <span className="text-critical-text">Mise à jour impossible : {error}</span>
        ) : (
          <>
            Une nouvelle version est disponible <span className="tabular font-medium">(v{update.version})</span>.
          </>
        )}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void install()}
        className="h-8 shrink-0 rounded-control bg-accent px-3 text-body-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {phase === 'error' ? 'Réessayer' : 'Mettre à jour'}
      </button>
      {busy ? null : (
        <IconButton label="Ignorer pour cette session" onClick={onDismiss}>
          <IconClose size={16} />
        </IconButton>
      )}
    </div>
  )
}
