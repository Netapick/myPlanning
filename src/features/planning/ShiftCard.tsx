import type { DragEvent } from 'react'
import { colorVar } from '@/lib/palette'
import { formatRange } from '@/lib/time'
import type { Shift } from '@/lib/types'

/**
 * Un créneau posé dans la grille. Bordure gauche 4px colorée par tranche
 * horaire — la convention du design system pour distinguer les postes d'un
 * coup d'œil sans dépendre uniquement du remplissage.
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
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full rounded-control border-l-4 bg-surface-2 px-2.5 py-1.5 text-left transition-opacity hover:bg-surface-3 ${dimmed ? 'opacity-80' : ''}`}
      style={{ borderLeftColor: colorVar(shift.colorIndex) }}
    >
      <p className="truncate text-body-sm font-medium text-ink">{shift.label}</p>
      <p className="tabular truncate text-body-sm text-muted">{formatRange(shift.start, shift.end)}</p>
    </button>
  )
}
