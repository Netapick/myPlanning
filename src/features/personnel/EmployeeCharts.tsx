import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { eventTypeBreakdown, holidayWorkSummary, weeklyHoursForEmployee } from '@/lib/employeeStats'
import type { Employee, Event, Shift } from '@/lib/types'

/**
 * Trois graphiques Recharts pour le mode « Affichage avancé » de la fiche
 * employé. Barres partout (pas de camembert) : chaque catégorie porte déjà
 * son libellé sur l'axe, donc pas de légende séparée à maintenir — et un
 * jugement d'angle est plus dur qu'un jugement de longueur pour comparer des
 * parts (skill dataviz). Couleurs prises dans les tokens déjà validés de
 * `theme.css` (`--chart-bar*` pour la série unique, `--cat-N` via
 * `EVENT_TYPE_COLOR_INDEX` pour la répartition par type).
 */

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--surface-1)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 6,
    fontSize: 13,
  },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 600 },
  itemStyle: { color: 'var(--text-secondary)' },
  cursor: { fill: 'var(--surface-2)' },
} as const

const AXIS_TICK = { fill: 'var(--text-tertiary)', fontSize: 12 }
const VALUE_LABEL = { fill: 'var(--text-tertiary)', fontSize: 12 }

export function EmployeeCharts({
  employee,
  events,
  shifts,
}: {
  employee: Employee
  events: Event[]
  shifts: Shift[]
}) {
  const weekly = weeklyHoursForEmployee(employee, shifts)
  const breakdown = eventTypeBreakdown(employee, events)
  const holidays = holidayWorkSummary(employee, shifts)
  const holidayData = [
    { name: 'Travaillés', value: holidays.worked },
    { name: 'Non travaillés', value: holidays.notWorked },
  ]

  return (
    <div className="flex flex-col gap-6">
      <ChartBlock title="Heures travaillées par semaine">
        {weekly.length === 0 ? (
          <EmptyChart message="Aucun créneau sur les derniers mois." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={{ stroke: 'var(--border-hairline)' }}
                tickLine={false}
              />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${value} h`, 'Travaillé']} />
              <Bar dataKey="hours" fill="var(--chart-bar)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartBlock>

      <ChartBlock title="Répartition des événements">
        {breakdown.length === 0 ? (
          <EmptyChart message="Aucun événement enregistré cette année." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(120, breakdown.length * 36)}>
            <BarChart data={breakdown} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} width={132} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${value} j`, 'Jours']} />
              <Bar dataKey="days" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', ...VALUE_LABEL }}>
                {breakdown.map((entry) => (
                  <Cell key={entry.type} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartBlock>

      <ChartBlock title="Jours fériés travaillés">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={holidayData} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} width={110} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${value} j`, 'Jours fériés']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', ...VALUE_LABEL }}>
              <Cell fill="var(--chart-bar)" />
              <Cell fill="var(--chart-bar-muted)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>
    </div>
  )
}

function ChartBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-body-sm font-medium text-ink">{title}</p>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return <p className="py-6 text-center text-body-sm text-faint">{message}</p>
}
