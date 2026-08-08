import type { ReactNode } from 'react'
import { colorVar } from '@/lib/palette'
import type { Employee, EmployeeStatus } from '@/lib/types'
import { initials } from '@/lib/types'

/**
 * Pastilles d'état et avatars.
 *
 * Une pastille de statut porte toujours son libellé écrit : la couleur double
 * l'information, elle ne la remplace jamais. C'est ce qui rend acceptable
 * l'usage de teintes à faible contraste sur fond clair.
 */

export type Tone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-hairline',
  good: 'bg-good-soft text-good-text border-good/30',
  warning: 'bg-warning-soft text-warning-text border-warning/40',
  serious: 'bg-serious-soft text-serious-text border-serious/40',
  critical: 'bg-critical-soft text-critical-text border-critical/30',
  accent: 'bg-accent-soft text-accent border-accent/30',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-body-sm font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

const STATUS_TONE: Record<EmployeeStatus, Tone> = {
  actif: 'good',
  conges: 'neutral',
  maladie: 'serious',
  inactif: 'neutral',
}

const STATUS_TEXT: Record<EmployeeStatus, string> = {
  actif: 'Actif',
  conges: 'Congés payés',
  maladie: 'Maladie',
  inactif: 'Inactif',
}

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_TEXT[status]}</Badge>
}

/**
 * Avatar en initiales. Les maquettes affichaient des photos hébergées à
 * distance ; sur un outil local elles seraient à la fois un point de panne et
 * une fuite de données. Les initiales sur aplat de la palette suffisent à
 * distinguer les lignes du tableau.
 */
export function Avatar({ employee, size = 40 }: { employee: Employee; size?: number }) {
  const index = (employee.id.charCodeAt(0) + employee.id.charCodeAt(employee.id.length - 1)) % 8
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        backgroundColor: colorVar(index + 1),
      }}
      aria-hidden="true"
    >
      {initials(employee)}
    </span>
  )
}

/** Puce de filtre — la ligne « Tous (24) / Actifs (21) / En congé (3) ». */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-hairline bg-surface-1 text-muted hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  )
}
