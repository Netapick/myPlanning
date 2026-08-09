import { Link } from 'react-router-dom'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import { IconBadge, IconCalendar, IconPieChart, IconPlus, IconUsers } from '@/components/ui/icons'
import { colorVar } from '@/lib/palette'
import { formatHours, formatSignedDuration } from '@/lib/time'
import { EVENT_TYPE_COLOR_INDEX, EVENT_TYPE_LABELS, EVENT_TYPE_TONE, fullName } from '@/lib/types'
import { longDateLabel, weekLabel } from '@/lib/week'
import { useDashboardData } from './useDashboardData'

const OTHER_COLOR = 'var(--border-strong)'
const CONTRACT_END_COLOR = 'var(--critical)'

/** Écran Tableau de bord : trois KPI, les prochains événements, les soldes à surveiller. */
export function DashboardScreen() {
  const { activeCount, weeklyMinutes, occupancyRate, upcomingItems, balanceAlerts } = useDashboardData()
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
          <PanelHeader
            title="Prochains événements"
            action={
              <Link to="/planning">
                <Button variant="ghost" size="sm">
                  Voir le planning
                </Button>
              </Link>
            }
          />
          {upcomingItems.length === 0 ? (
            <EmptyState
              icon={<IconBadge size={24} />}
              title="Rien de prévu"
              description="Aucun événement ni fin de contrat à venir."
              action={
                <Link to="/planning">
                  <Button size="sm" icon={<IconPlus size={16} />}>
                    Ajouter un événement
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {upcomingItems.map((item) => {
                if (item.kind === 'contract-ending') {
                  const { employee, endDate, contractType, remainingDays } = item
                  return (
                    <li key={`contract-${employee.id}`} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className="h-8 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: CONTRACT_END_COLOR }}
                        aria-hidden="true"
                      />
                      <Avatar employee={employee} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
                        <p className="tabular truncate text-body-sm text-muted">
                          Fin de {contractType} — {longDateLabel(new Date(`${endDate}T12:00:00`))}
                        </p>
                      </div>
                      <Badge tone={remainingDays <= 7 ? 'critical' : 'serious'}>Fin de contrat</Badge>
                    </li>
                  )
                }

                const { event, employee, overtimeRemainingMinutes } = item
                const color = event.type === 'autre' ? OTHER_COLOR : colorVar(EVENT_TYPE_COLOR_INDEX[event.type])
                const showOvertime = event.type === 'ferie' || overtimeRemainingMinutes > 0
                return (
                  <li key={event.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <Avatar employee={employee} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
                      <p className="tabular truncate text-body-sm text-muted">
                        {event.startDate === event.endDate
                          ? longDateLabel(new Date(`${event.startDate}T12:00:00`))
                          : `${event.startDate} → ${event.endDate}`}
                      </p>
                      {showOvertime ? (
                        <p className="tabular truncate text-body-sm text-faint">
                          Heures sup. à récupérer : {formatSignedDuration(overtimeRemainingMinutes)}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={EVENT_TYPE_TONE[event.type]}>{EVENT_TYPE_LABELS[event.type]}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Soldes de l'équipe" />
          {balanceAlerts.length === 0 ? (
            <EmptyState
              icon={<IconPieChart size={24} />}
              title="Rien à signaler côté soldes"
              description="Aucun CP bas ni solde d'heures sup. élevé pour l'instant."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {balanceAlerts.map(({ employee, leaveRemaining, overtimeRemainingMinutes, leaveLow, overtimeHigh }) => (
                <li key={employee.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar employee={employee} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
                    <p className="tabular truncate text-body-sm text-muted">
                      CP restants : {leaveRemaining} j · Heures sup. : {formatSignedDuration(overtimeRemainingMinutes)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {leaveLow ? <Badge tone="warning">CP bas</Badge> : null}
                    {overtimeHigh ? <Badge tone="serious">Sup. élevées</Badge> : null}
                  </div>
                </li>
              ))}
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
