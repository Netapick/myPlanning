import type { ReactNode } from 'react'

/**
 * Le module de données du design system : surface blanche, filet de 1px,
 * rayon 8px. C'est le seul conteneur de contenu de l'application — tuiles du
 * tableau de bord, grille du planning, tableau du personnel en héritent tous.
 */

interface PanelProps {
  children: ReactNode
  className?: string
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <section
      className={`rounded-panel border border-hairline bg-surface-1 ${className}`}
    >
      {children}
    </section>
  )
}

interface PanelHeaderProps {
  title: string
  action?: ReactNode
  /** En-tête gris clair (`#EBECF0`), réservé aux listes et tableaux. */
  tinted?: boolean
}

export function PanelHeader({ title, action, tinted = false }: PanelHeaderProps) {
  return (
    <header
      className={`flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5 ${tinted ? 'bg-surface-header' : ''}`}
    >
      <h3
        className={
          tinted
            ? 'text-label tracking-wide text-muted uppercase'
            : 'text-headline-md text-ink'
        }
      >
        {title}
      </h3>
      {action}
    </header>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  /** Bordure pointillée — la convention « zone de dépôt / place libre ». */
  dashed?: boolean
}

export function EmptyState({ icon, title, description, action, dashed = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-10 text-center ${
        dashed ? 'rounded-panel border-2 border-dashed border-hairline' : ''
      }`}
    >
      {icon ? <div className="text-faint">{icon}</div> : null}
      <p className="text-body-md font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-body-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
