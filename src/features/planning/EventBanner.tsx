import type { MouseEvent } from 'react'
import { IconEdit } from '@/components/ui/icons'
import { colorVar } from '@/lib/palette'
import { EVENT_TYPE_COLOR_INDEX, EVENT_TYPE_LABELS } from '@/lib/types'
import type { Event, EventType } from '@/lib/types'

/** Gris neutre hors palette catégorielle — « autre » n'est pas une catégorie. */
const OTHER_COLOR = 'var(--border-strong)'

const eventColor = (type: EventType): string =>
  type === 'autre' ? OTHER_COLOR : colorVar(EVENT_TYPE_COLOR_INDEX[type])

/**
 * Remplissage teinté par type — même mécanisme que les `-soft` des badges de
 * statut (`--good-soft`, etc. dans theme.css). « Autre » reste sur l'aplat
 * neutre : hors palette catégorielle, il n'a pas de teinte à mélanger.
 */
const eventFill = (type: EventType): string =>
  type === 'autre' ? 'var(--surface-2)' : `color-mix(in srgb, ${eventColor(type)} 14%, var(--surface-2))`

/**
 * Bandeau d'événement dans une case du planning — même convention que
 * `ShiftCard` (bordure gauche 4px colorée) pour rester lisible au même
 * endroit, mais avec une couleur fixe par type plutôt que la couleur choisie
 * du créneau : la teinte doit se reconnaître d'un coup d'œil dans toute
 * l'app, pas varier d'un événement à l'autre. Le remplissage teinté (plutôt
 * qu'un simple liseré) le distingue d'un coup d'œil d'un `ShiftCard`. Icône
 * crayon visible au survol, même convention que `ShiftCard`.
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
      className="group relative w-full min-w-0 rounded-control border-l-4 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-3 print:px-1 print:py-0.5"
      style={{ borderLeftColor: eventColor(event.type), backgroundColor: eventFill(event.type) }}
      title={EVENT_TYPE_LABELS[event.type]}
    >
      <p className="min-w-0 truncate pr-4 text-body-sm font-medium text-ink">{EVENT_TYPE_LABELS[event.type]}</p>
      <IconEdit
        size={13}
        aria-hidden="true"
        className="no-print absolute top-1.5 right-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  )
}
