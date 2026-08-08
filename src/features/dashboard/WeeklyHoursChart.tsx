import { formatHours } from '@/lib/time'
import { shortDayLabel } from '@/lib/week'
import type { DayTotal } from './useDashboardData'

/**
 * Histogramme des heures planifiées par jour — une seule série, donc une
 * seule teinte (le bleu de la palette catégorielle) et aucune légende : le
 * titre de la tuile suffit à nommer ce qui est montré (skill dataviz).
 *
 * Marques : barres fines, coin supérieur arrondi à 4px ancré à la base,
 * jour courant distingué par la teinte accent pleine plutôt que par un motif
 * séparé (un seul signal visuel, pas deux).
 */
export function WeeklyHoursChart({ days }: { days: DayTotal[] }) {
  const max = Math.max(...days.map((day) => day.minutes), 60)

  return (
    <div className="flex h-40 items-end gap-3 px-1" role="img" aria-label="Heures planifiées par jour de la semaine">
      {days.map((day) => {
        const heightPct = Math.max(2, (day.minutes / max) * 100)
        return (
          <div key={day.iso} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end">
              <div
                className={`w-full rounded-t ${day.isToday ? 'bg-chart-bar' : 'bg-chart-bar-muted'}`}
                style={{ height: `${heightPct}%` }}
                title={`${formatHours(day.minutes)} planifiées`}
              />
            </div>
            <p className={`text-label ${day.isToday ? 'font-bold text-accent' : 'text-faint'}`}>
              {shortDayLabel(day.date)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
