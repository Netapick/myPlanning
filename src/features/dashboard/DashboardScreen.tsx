import { Link } from 'react-router-dom'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import { IconBadge, IconCalendar, IconPieChart, IconPlus, IconUsers } from '@/components/ui/icons'
import { colorVar } from '@/lib/palette'
import { formatHours, formatRange } from '@/lib/time'
import { fullName } from '@/lib/types'
import { weekLabel } from '@/lib/week'
import { useDashboardData } from './useDashboardData'
import { WeeklyHoursChart } from './WeeklyHoursChart'

/** Écran Tableau de bord : trois KPI, un histogramme, les prochains créneaux. */
export function DashboardScreen() {
  const { activeCount, weeklyMinutes, occupancyRate, dayTotals, upcoming } = useDashboardData()
  const now = new Date()

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={weekLabel(now)} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<IconUsers size={20} />}
          label={activeCount > 1 ? 'Personnes actives' : 'Personne active'}
          value={String(activeCount)}
        />
        <KpiCard
          icon={<IconCalendar size={20} />}
          label="Heures planifiées (semaine)"
          value={formatHours(weeklyMinutes)}
        />
        <KpiCard
          icon={<IconPieChart size={20} />}
          label="Taux d'occupation"
          value={`${Math.round(occupancyRate * 100)} %`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel>
          <PanelHeader title="Heures planifiées par jour" />
          <div className="px-5 py-5">
            <WeeklyHoursChart days={dayTotals} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Prochains créneaux"
            action={
              <Link to="/planning">
                <Button variant="ghost" size="sm">
                  Voir le planning
                </Button>
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<IconBadge size={24} />}
              title="Rien de prévu"
              description="Aucun créneau à venir dans le planning."
              action={
                <Link to="/planning">
                  <Button size="sm" icon={<IconPlus size={16} />}>
                    Ajouter un créneau
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {upcoming.map(({ shift, employee, startsAt, endsAt }) => {
                const inProgress = startsAt <= now && now < endsAt
                return (
                  <li key={shift.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: colorVar(shift.colorIndex) }}
                      aria-hidden="true"
                    />
                    <Avatar employee={employee} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
                      <p className="tabular truncate text-body-sm text-muted">
                        {shift.label} · {formatRange(shift.start, shift.end)}
                      </p>
                    </div>
                    <Badge tone={inProgress ? 'good' : 'neutral'}>
                      {inProgress ? 'En cours' : 'À venir'}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Panel className="p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
        {icon}
      </div>
      <p className="text-label tracking-wide text-muted uppercase">{label}</p>
      <p className="tabular mt-1 text-display text-ink">{value}</p>
    </Panel>
  )
}
