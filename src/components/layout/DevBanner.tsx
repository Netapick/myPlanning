import { IconAlert } from '@/components/ui/icons'

/**
 * Rappel permanent que la build en cours est une version de développement /
 * démo, pas la version finale — contrairement à `UpdateBanner`, pas de
 * bouton pour la masquer : l'idée est justement qu'elle reste visible tant
 * que ce n'est pas une release.
 */
export function DevBanner() {
  return (
    <div className="flex items-center gap-3 border-b border-critical/30 bg-critical-soft px-4 py-2.5 text-body-sm sm:px-canvas">
      <IconAlert size={16} className="shrink-0 text-critical-text" aria-hidden="true" />
      <p className="flex-1 font-medium text-critical-text">Version de développement — Démo</p>
    </div>
  )
}
