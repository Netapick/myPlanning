import type { ReactNode } from 'react'

/** Titre d'écran + accroche + actions, identiques sur les quatre pages. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-headline-lg text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-body-md text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
