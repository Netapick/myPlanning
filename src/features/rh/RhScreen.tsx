import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { currentYearPeriod, employeeBalances } from '@/lib/balances'
import { Avatar, Badge, FilterChip } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import { IconChevronLeft, IconChevronRight, IconEdit, IconEvent, IconTrash, IconUsers } from '@/components/ui/icons'
import { dateRangesOverlap } from '@/lib/events'
import { formatSignedDuration } from '@/lib/time'
import type { Employee, Event, EventType } from '@/lib/types'
import { compareEmployeeNames, EVENT_TYPE_LABELS, EVENT_TYPE_TONE, fullName } from '@/lib/types'
import { fromIsoMonthValue, isoMonthValue, longDateLabel, monthLabel, toIso } from '@/lib/week'
import { EMPTY_EMPLOYEES, EMPTY_EVENTS, EMPTY_SHIFTS, EMPTY_TEAMS, useDataStore } from '@/store/data'
import { useUiStore } from '@/store/ui'
import { EventForm } from '../personnel/EventForm'

type TypeFilter = 'all' | EventType

const EVENT_TYPES: EventType[] = [
  'conges',
  'maladie',
  'maternite',
  'formation',
  'repos',
  'recup_ferie',
  'recup_hs',
  'autre',
]

/**
 * Écran RH : point central de gestion des repos, récupérations de jours
 * fériés, congés et autres événements — édition/suppression comblent un
 * manque de Personnels (qui ne permet que la création), et le tableau des
 * soldes donne une vue d'ensemble jamais affichée ailleurs (le Dashboard ne
 * montre que les alertes, pas tout le monde).
 */
export function RhScreen() {
  const employees = useDataStore((state) => state.document?.employees ?? EMPTY_EMPLOYEES)
  const teams = useDataStore((state) => state.document?.teams ?? EMPTY_TEAMS)
  const shifts = useDataStore((state) => state.document?.shifts ?? EMPTY_SHIFTS)
  const events = useDataStore((state) => state.document?.events ?? EMPTY_EVENTS)
  const upsertEvent = useDataStore((state) => state.upsertEvent)
  const removeEvent = useDataStore((state) => state.removeEvent)
  const upsertEmployee = useDataStore((state) => state.upsertEmployee)
  const search = useUiStore((state) => state.search)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [monthReference, setMonthReference] = useState(() => new Date())
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [toDelete, setToDelete] = useState<Event | null>(null)
  const [adjusting, setAdjusting] = useState<Employee | null>(null)

  const activeEmployees = useMemo(
    () =>
      employees
        .filter((employee) => !employee.archived)
        .sort(compareEmployeeNames),
    [employees],
  )
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])
  const period = useMemo(() => currentYearPeriod(), [])

  const monthStart = useMemo(() => toIso(startOfMonth(monthReference)), [monthReference])
  const monthEnd = useMemo(() => toIso(endOfMonth(monthReference)), [monthReference])

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events
      .filter((event) => typeFilter === 'all' || event.type === typeFilter)
      .filter((event) => {
        if (teamFilter === 'all') return true
        return employeeById.get(event.employeeId)?.teamId === teamFilter
      })
      .filter((event) => showAllMonths || dateRangesOverlap(event.startDate, event.endDate, monthStart, monthEnd))
      .filter((event) => {
        if (!query) return true
        const employee = employeeById.get(event.employeeId)
        return employee ? fullName(employee).toLowerCase().includes(query) : false
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [events, typeFilter, teamFilter, showAllMonths, monthStart, monthEnd, search, employeeById])

  const balances = useMemo(
    () =>
      activeEmployees
        .map((employee) => ({ employee, balances: employeeBalances(employee, events, shifts, period) }))
        .sort((a, b) => compareEmployeeNames(a.employee, b.employee)),
    [activeEmployees, events, shifts, period],
  )

  const openCreate = () => {
    setEditingEvent(null)
    setEventFormOpen(true)
  }
  const openEdit = (event: Event) => {
    setEditingEvent(event)
    setEventFormOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Ressources humaines"
        subtitle="Repos, congés, récupérations et soldes de l'équipe."
        actions={
          <Button icon={<IconEvent size={18} />} onClick={openCreate}>
            Nouvel événement
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
          Tous les types
        </FilterChip>
        {EVENT_TYPES.map((type) => (
          <FilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
            {EVENT_TYPE_LABELS[type]}
          </FilterChip>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip active={teamFilter === 'all'} onClick={() => setTeamFilter('all')}>
          Toutes les équipes
        </FilterChip>
        {teams.map((team) => (
          <FilterChip key={team.id} active={teamFilter === team.id} onClick={() => setTeamFilter(team.id)}>
            {team.name}
          </FilterChip>
        ))}
      </div>

      <Panel className="mb-6">
        <PanelHeader
          title={`${filteredEvents.length} événement${filteredEvents.length > 1 ? 's' : ''}`}
          tinted
          action={
            <div className="flex flex-wrap items-center gap-2">
              {showAllMonths ? null : (
                <>
                  <IconButton
                    label="Mois précédent"
                    onClick={() => setMonthReference((current) => subMonths(current, 1))}
                  >
                    <IconChevronLeft size={16} />
                  </IconButton>
                  <input
                    type="month"
                    aria-label="Aller à un mois précis"
                    title="Aller à un mois précis"
                    value={isoMonthValue(monthReference)}
                    onChange={(event) => {
                      const target = fromIsoMonthValue(event.target.value)
                      if (target) setMonthReference(target)
                    }}
                    className="h-8 rounded-control border border-hairline bg-surface-1 px-2 text-body-sm text-ink capitalize field-focus"
                  />
                  <span className="hidden text-body-sm text-muted capitalize sm:inline">
                    {monthLabel(monthReference)}
                  </span>
                  <IconButton
                    label="Mois suivant"
                    onClick={() => setMonthReference((current) => addMonths(current, 1))}
                  >
                    <IconChevronRight size={16} />
                  </IconButton>
                  <Button variant="secondary" size="sm" onClick={() => setMonthReference(new Date())}>
                    Ce mois-ci
                  </Button>
                </>
              )}
              <Button variant="secondary" size="sm" onClick={() => setShowAllMonths((current) => !current)}>
                {showAllMonths ? 'Filtrer par mois' : 'Tous les mois'}
              </Button>
            </div>
          }
        />
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={<IconEvent size={28} />}
            title="Aucun événement trouvé"
            description="Ajuste les filtres, ou ajoute un nouvel événement."
            action={<Button onClick={openCreate}>Nouvel événement</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-hairline text-label tracking-wide text-muted uppercase">
                  <th className="px-5 py-3 font-semibold">Personne</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Période</th>
                  <th className="px-5 py-3 font-semibold">Note</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const employee = employeeById.get(event.employeeId)
                  if (!employee) return null
                  return (
                    <tr key={event.id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar employee={employee} size={32} />
                          <p className="font-medium text-ink">{fullName(employee)}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={EVENT_TYPE_TONE[event.type]}>{EVENT_TYPE_LABELS[event.type]}</Badge>
                      </td>
                      <td className="tabular px-5 py-3 text-muted">
                        {event.startDate === event.endDate
                          ? longDateLabel(new Date(`${event.startDate}T12:00:00`))
                          : `${event.startDate} → ${event.endDate}`}
                        {event.start && event.end ? ` · ${event.start}–${event.end}` : null}
                      </td>
                      <td className="px-5 py-3 text-muted">{event.note || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton label="Modifier" onClick={() => openEdit(event)}>
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton label="Supprimer" tone="danger" onClick={() => setToDelete(event)}>
                            <IconTrash size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Soldes de l'équipe" tinted />
        {balances.length === 0 ? (
          <EmptyState icon={<IconUsers size={28} />} title="Aucune personne active" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-hairline text-label tracking-wide text-muted uppercase">
                  <th className="px-5 py-3 font-semibold">Personne</th>
                  <th className="px-5 py-3 font-semibold">CP restants</th>
                  <th className="px-5 py-3 font-semibold">Heures sup. restantes</th>
                  <th className="px-5 py-3 font-semibold">Repos posés</th>
                  <th className="px-5 py-3 text-right font-semibold">Ajuster</th>
                </tr>
              </thead>
              <tbody>
                {balances.map(({ employee, balances: employeeBalance }) => (
                  <tr key={employee.id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar employee={employee} size={32} />
                        <p className="font-medium text-ink">{fullName(employee)}</p>
                      </div>
                    </td>
                    <td className="tabular px-5 py-3 text-muted">{employeeBalance.leaveRemaining} j</td>
                    <td className="tabular px-5 py-3 text-muted">
                      {formatSignedDuration(employeeBalance.overtimeRemainingMinutes)}
                    </td>
                    <td className="tabular px-5 py-3 text-muted">{employeeBalance.restDaysTaken}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAdjusting(employee)}
                        className="inline-flex items-center gap-1 text-body-sm font-medium text-accent hover:underline"
                      >
                        <IconEdit size={14} />
                        Ajuster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <EventForm
        open={eventFormOpen}
        event={editingEvent}
        employees={activeEmployees}
        onClose={() => setEventFormOpen(false)}
        onSave={(event) => upsertEvent(event)}
        onDelete={editingEvent ? () => removeEvent(editingEvent.id) : undefined}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet événement ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeEvent(toDelete.id)
          setToDelete(null)
        }}
      />

      <AdjustBalanceModal
        employee={adjusting}
        onClose={() => setAdjusting(null)}
        onSave={(employee) => {
          upsertEmployee(employee)
          setAdjusting(null)
        }}
      />
    </div>
  )
}

/**
 * Éditeur de solde de départ minimal, propre à RH — volontairement
 * indépendant de `EmployeeForm`/Personnels : ajuster un solde depuis RH ne
 * doit ni ouvrir la fiche complète, ni changer d'écran.
 */
function AdjustBalanceModal({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee | null
  onClose: () => void
  onSave: (employee: Employee) => void
}) {
  const [leaveAccrued, setLeaveAccrued] = useState('0')
  const [overtimeHours, setOvertimeHours] = useState('0')

  useEffect(() => {
    if (!employee) return
    setLeaveAccrued(String(employee.leaveBalance.accrued))
    setOvertimeHours(String(employee.overtimeBalanceMinutes / 60))
  }, [employee])

  const submit = () => {
    if (!employee) return
    onSave({
      ...employee,
      leaveBalance: { accrued: Number(leaveAccrued) || 0 },
      overtimeBalanceMinutes: Math.round((Number(overtimeHours) || 0) * 60),
    })
  }

  return (
    <Modal
      open={employee !== null}
      title={employee ? `Ajuster les soldes — ${fullName(employee)}` : 'Ajuster les soldes'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Enregistrer</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="CP acquis (jours)"
          type="number"
          step="0.5"
          value={leaveAccrued}
          onChange={(e) => setLeaveAccrued(e.target.value)}
        />
        <TextField
          label="Solde heures sup. de départ (h)"
          type="number"
          step="0.5"
          value={overtimeHours}
          onChange={(e) => setOvertimeHours(e.target.value)}
        />
      </div>
    </Modal>
  )
}
