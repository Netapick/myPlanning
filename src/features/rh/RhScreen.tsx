import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { currentYearPeriod, employeeBalances } from '@/lib/balances'
import { Avatar, Badge, FilterChip } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import { CalendarOff, IconClock, IconEdit, IconTrash, IconUsers } from '@/components/ui/icons'
import { formatSignedDuration } from '@/lib/time'
import type { Event, EventType } from '@/lib/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_TONE, fullName } from '@/lib/types'
import { longDateLabel } from '@/lib/week'
import { useDataStore } from '@/store/data'
import { useUiStore } from '@/store/ui'
import { EventForm } from '../personnel/EventForm'

type TypeFilter = 'all' | EventType

const EVENT_TYPES: EventType[] = ['conges', 'maladie', 'maternite', 'formation', 'repos', 'ferie', 'autre']

/**
 * Écran RH : point central de gestion des repos, récupérations de jours
 * fériés, congés et autres événements — édition/suppression comblent un
 * manque de Personnels (qui ne permet que la création), et le tableau des
 * soldes donne une vue d'ensemble jamais affichée ailleurs (le Dashboard ne
 * montre que les alertes, pas tout le monde).
 */
export function RhScreen() {
  const employees = useDataStore((state) => state.document?.employees ?? [])
  const teams = useDataStore((state) => state.document?.teams ?? [])
  const shifts = useDataStore((state) => state.document?.shifts ?? [])
  const events = useDataStore((state) => state.document?.events ?? [])
  const upsertEvent = useDataStore((state) => state.upsertEvent)
  const removeEvent = useDataStore((state) => state.removeEvent)
  const search = useUiStore((state) => state.search)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [toDelete, setToDelete] = useState<Event | null>(null)

  const activeEmployees = useMemo(() => employees.filter((employee) => !employee.archived), [employees])
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])
  const period = useMemo(() => currentYearPeriod(), [])

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events
      .filter((event) => typeFilter === 'all' || event.type === typeFilter)
      .filter((event) => {
        if (teamFilter === 'all') return true
        return employeeById.get(event.employeeId)?.teamId === teamFilter
      })
      .filter((event) => {
        if (!query) return true
        const employee = employeeById.get(event.employeeId)
        return employee ? fullName(employee).toLowerCase().includes(query) : false
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [events, typeFilter, teamFilter, search, employeeById])

  const balances = useMemo(
    () =>
      activeEmployees
        .map((employee) => ({ employee, balances: employeeBalances(employee, events, shifts, period) }))
        .sort((a, b) => fullName(a.employee).localeCompare(fullName(b.employee), 'fr')),
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
        title="RH"
        subtitle="Repos, congés, récupérations et soldes de l'équipe."
        actions={
          <Button icon={<CalendarOff size={18} />} onClick={openCreate}>
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
        />
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarOff size={28} />}
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
                      <Link
                        to={`/personnel?employee=${employee.id}`}
                        className="inline-flex items-center gap-1 text-body-sm font-medium text-accent hover:underline"
                      >
                        <IconClock size={14} />
                        Ajuster →
                      </Link>
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
    </div>
  )
}
