import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, FilterChip } from '@/components/ui/Badge'
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

type BalanceTab = 'conges' | 'heuresSup'

/** Écran Tableau de bord : KPI, les prochains événements, les soldes à surveiller. */
export function DashboardScreen() {
  const { activeCount, weeklyMinutes, upcomingItems, balanceAlerts } = useDashboardData()
  const now = new Date()
  const [balanceTab, setBalanceTab] = useState<BalanceTab>('conges')

  // Congés : seulement les cas à surveiller (CP bas). Heures Sup. : tout le
  // monde qui a un solde non nul, en continu — pas la peine d'attendre un
  // seuil « élevé » pour les voir, contrairement à l'alerte CP qui reste un
  // signal d'urgence ; un solde à 0h n'apporte rien à afficher.
  const congesAlerts = balanceAlerts.filter((alert) => alert.leaveLow)
  const heuresSupAlerts = balanceAlerts
    .filter((alert) => alert.overtimeRemainingMinutes !== 0)
    .sort((a, b) => b.overtimeRemainingMinutes - a.overtimeRemainingMinutes)
  const visibleBalances = balanceTab === 'conges' ? congesAlerts : heuresSupAlerts

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={weekLabel(now)} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                const showOvertime =
                  event.type === 'recup_hs' || event.type === 'recup_ferie' || overtimeRemainingMinutes > 0
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
          <PanelHeader
            title="Soldes de l'équipe"
            action={
              <div className="flex gap-2">
                <TabChip active={balanceTab === 'conges'} count={congesAlerts.length} onClick={() => setBalanceTab('conges')}>
                  Congés
                </TabChip>
                <TabChip
                  active={balanceTab === 'heuresSup'}
                  count={heuresSupAlerts.length}
                  onClick={() => setBalanceTab('heuresSup')}
                >
                  Heures Sup.
                </TabChip>
              </div>
            }
          />
          {visibleBalances.length === 0 ? (
            <EmptyState
              icon={<IconPieChart size={24} />}
              title="Rien à signaler"
              description={
                balanceTab === 'conges'
                  ? 'Aucun CP bas pour l’instant.'
                  : 'Personne n’a de solde d’heures sup. pour l’instant.'
              }
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {visibleBalances.map(({ employee, leaveRemaining, overtimeRemainingMinutes, overtimeHigh }) => (
                <li key={employee.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar employee={employee} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
                    <p className="tabular truncate text-body-sm text-muted">
                      {balanceTab === 'conges'
                        ? `CP restants : ${leaveRemaining} j`
                        : `Heures sup. : ${formatSignedDuration(overtimeRemainingMinutes)}`}
                    </p>
                  </div>
                  {balanceTab === 'conges' ? (
                    <Badge tone="warning">CP bas</Badge>
                  ) : overtimeHigh ? (
                    <Badge tone="serious">Sup. élevées</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/** `FilterChip` avec un badge chiffré rouge (même pattern que la cloche de notifications), masqué si `count` est nul. */
function TabChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <FilterChip active={active} onClick={onClick}>
        {children}
      </FilterChip>
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
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
