import type { MouseEvent } from 'react'
import { EVENT_TYPE_LABELS } from '@/lib/types'
import type { Event } from '@/lib/types'

/**
 * Bandeau d'événement dans une case du planning — visuellement distinct
 * d'un `ShiftCard` (pas de bordure colorée par tranche, hachures obliques
 * plutôt qu'un aplat) car un événement n'est pas un horaire de travail :
 * il bloque la journée plutôt que de la remplir.
 */
export function EventBanner({
  event,
  onClick,
}: {
  event: Event
  onClick: (mouseEvent: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-control border border-dashed border-strong bg-surface-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-3"
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, transparent, transparent 6px, color-mix(in srgb, var(--border-strong) 60%, transparent) 6px, color-mix(in srgb, var(--border-strong) 60%, transparent) 7px)',
      }}
    >
      <p className="truncate text-body-sm font-medium text-muted">{EVENT_TYPE_LABELS[event.type]}</p>
    </button>
  )
}
