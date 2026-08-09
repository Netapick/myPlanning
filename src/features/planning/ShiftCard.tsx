import type { DragEvent, MouseEvent } from 'react'
import { IconEdit } from '@/components/ui/icons'
import { colorVar } from '@/lib/palette'
import { formatRange } from '@/lib/time'
import type { Shift } from '@/lib/types'

/**
 * Un créneau posé dans la grille. Bordure gauche 4px colorée par tranche
 * horaire — la convention du design system pour distinguer les postes d'un
 * coup d'œil sans dépendre uniquement du remplissage. Icône crayon visible au
 * survol : la carte entière ouvre déjà l'édition au clic, mais l'icône lève
 * toute ambiguïté avec le bouton « + » de la case.
 */
export function ShiftCard({
  shift,
  dimmed = false,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  shift: Shift
  dimmed?: boolean
  onClick: () => void
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnd: () => void
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Empêche le clic de remonter jusqu'à la case (qui ouvrirait une création
    // au lieu de l'édition de ce créneau — voir PlanningScreen.tsx).
    event.stopPropagation()
    onClick()
  }

  return (
    <button
      type="button"
      draggable
      onClick={handleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative w-full min-w-0 rounded-control border-l-4 bg-surface-2 px-2.5 py-1.5 text-left transition-opacity hover:bg-surface-3 print:px-1 print:py-0.5 ${dimmed ? 'opacity-80' : ''}`}
      style={{ borderLeftColor: colorVar(shift.colorIndex) }}
      title={`${shift.label} (${formatRange(shift.start, shift.end)})`}
    >
      {/* Deux lignes à l'écran (lisible, cliquable) ; une seule à l'impression
          — sur papier, l'espace vertical est le facteur limitant pour faire
          tenir toute l'équipe sur une page, pas la lisibilité d'un second
          horaire séparé. */}
      <div className="print:hidden">
        <p className="min-w-0 truncate pr-4 text-body-sm font-medium text-ink">{shift.label}</p>
        <p className="tabular min-w-0 truncate text-body-sm text-muted">{formatRange(shift.start, shift.end)}</p>
      </div>
      <p className="tabular hidden min-w-0 truncate pr-4 text-body-sm font-medium text-ink print:block">
        {shift.label} {formatRange(shift.start, shift.end)}
      </p>
      <IconEdit
        size={13}
        aria-hidden="true"
        className="no-print absolute top-1.5 right-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  )
}
