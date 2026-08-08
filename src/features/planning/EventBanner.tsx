import type { MouseEvent } from 'react'
import { colorVar } from '@/lib/palette'
import { EVENT_TYPE_COLOR_INDEX, EVENT_TYPE_LABELS } from '@/lib/types'
import type { Event, EventType } from '@/lib/types'

/** Gris neutre hors palette catégorielle — « autre » n'est pas une catégorie. */
const OTHER_COLOR = 'var(--border-strong)'

const eventColor = (type: EventType): string =>
  type === 'autre' ? OTHER_COLOR : colorVar(EVENT_TYPE_COLOR_INDEX[type])

/**
 * Bandeau d'événement dans une case du planning — même convention que
 * `ShiftCard` (bordure gauche 4px colorée) pour rester lisible au même
 * endroit, mais avec une couleur fixe par type plutôt que la couleur choisie
 * du créneau : la teinte doit se reconnaître d'un coup d'œil dans toute
 * l'app, pas varier d'un événement à l'autre.
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
      className="w-full rounded-control border-l-4 bg-surface-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-3"
      style={{ borderLeftColor: eventColor(event.type) }}
    >
      <p className="truncate text-body-sm font-medium text-ink">{EVENT_TYPE_LABELS[event.type]}</p>
    </button>
  )
}
