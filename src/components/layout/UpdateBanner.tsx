import { IconButton } from '@/components/ui/Button'
import { IconClose, IconDownload } from '@/components/ui/icons'
import type { AvailableUpdate } from '@/lib/appUpdate'

/**
 * Bannière de mise à jour disponible — check fait au démarrage (voir
 * `AppShell.tsx`), pas un widget à aller consulter dans Paramètres. État
 * local au shell, non persisté : réapparaît tant que la version n'a pas
 * changé, mais reste masquable pour la session en cours.
 */
export function UpdateBanner({ update, onDismiss }: { update: AvailableUpdate; onDismiss: () => void }) {
  const openDownload = () => {
    window.open(update.downloadUrl ?? update.releaseUrl, '_blank', 'noopener')
  }

  return (
    <div className="flex items-center gap-3 border-b border-accent/30 bg-accent-soft px-4 py-2.5 text-body-sm sm:px-canvas">
      <IconDownload size={16} className="shrink-0 text-accent" aria-hidden="true" />
      <p className="flex-1 text-ink">
        Une nouvelle version est disponible <span className="tabular font-medium">(v{update.version})</span>.
      </p>
      <button
        type="button"
        onClick={openDownload}
        className="h-8 shrink-0 rounded-control bg-accent px-3 text-body-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
      >
        Télécharger
      </button>
      <IconButton label="Ignorer pour cette session" onClick={onDismiss}>
        <IconClose size={16} />
      </IconButton>
    </div>
  )
}
