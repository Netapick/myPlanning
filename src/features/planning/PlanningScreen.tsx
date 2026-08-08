import { useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, FilterChip } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from '@/components/ui/icons'
import { dateRangesOverlap } from '@/lib/events'
import { formatDuration, workedMinutes } from '@/lib/time'
import type { Employee, Event, Shift } from '@/lib/types'
import { fullName } from '@/lib/types'
import {
  isToday,
  longDateLabel,
  shortDateLabel,
  shortDayLabel,
  toIso,
  weekDays,
  weekLabel,
} from '@/lib/week'
import { useDataStore } from '@/store/data'
import { EventBanner } from './EventBanner'
import { PlanningEntryModal } from './PlanningEntryModal'
import { ShiftCard } from './ShiftCard'

interface DraftTarget {
  employeeId: string
  date: string
}

/**
 * Planning hebdomadaire : grille Employé × 7 jours.
 *
 * Une case peut contenir plusieurs créneaux (ex. matin + après-midi, coupés
 * par une pause déjeuner) — ils s'empilent verticalement, chacun restant
 * cliquable et déplaçable indépendamment. Les événements (absences, congés…)
 * s'affichent séparément, en bandeau au-dessus des créneaux du jour : ils
 * couvrent une période plutôt qu'un horaire, leur rendu est donc différent.
 *
 * Le glisser-déposer déplace un créneau d'une case à l'autre — même employé
 * ou non, même jour ou non — en réutilisant simplement `upsertShift` avec un
 * `employeeId`/`date` modifiés. Aucune API dédiée : c'est la même mutation
 * qu'une édition manuelle.
 */
export function PlanningScreen() {
  const employees = useDataStore((state) => state.document?.employees ?? [])
  const teams = useDataStore((state) => state.document?.teams ?? [])
  const templates = useDataStore((state) => state.document?.shiftTemplates ?? [])
  const shifts = useDataStore((state) => state.document?.shifts ?? [])
  const events = useDataStore((state) => state.document?.events ?? [])
  const upsertShift = useDataStore((state) => state.upsertShift)
  const removeShift = useDataStore((state) => state.removeShift)
  const upsertEvent = useDataStore((state) => state.upsertEvent)
  const removeEvent = useDataStore((state) => state.removeEvent)
  const navigate = useNavigate()

  const [reference, setReference] = useState(() => new Date())
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [entryOpen, setEntryOpen] = useState(false)
  const [entryTarget, setEntryTarget] = useState<DraftTarget | null>(null)
  const [entryShift, setEntryShift] = useState<Shift | null>(null)
  const [entryEvent, setEntryEvent] = useState<Event | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DraftTarget | null>(null)

  const days = useMemo(() => weekDays(reference), [reference])
  const isoDays = useMemo(() => days.map(toIso), [days])

  const visibleEmployees = useMemo(
    () =>
      employees
        .filter((employee) => !employee.archived)
        .filter((employee) => teamFilter === 'all' || employee.teamId === teamFilter)
        .sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr')),
    [employees, teamFilter],
  )

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, Shift[]>()
    for (const shift of shifts) {
      if (!isoDays.includes(shift.date)) continue
      const key = `${shift.employeeId}|${shift.date}`
      const list = map.get(key)
      if (list) list.push(shift)
      else map.set(key, [shift])
    }
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start))
    return map
  }, [shifts, isoDays])

  // Un événement peut déborder de la semaine affichée (ex. congés de deux
  // semaines) : on ne garde que ceux qui touchent au moins un jour visible.
  const weekStart = isoDays[0]
  const weekEnd = isoDays[isoDays.length - 1]
  const eventsByEmployee = useMemo(() => {
    const map = new Map<string, Event[]>()
    if (!weekStart || !weekEnd) return map
    for (const event of events) {
      if (!dateRangesOverlap(event.startDate, event.endDate, weekStart, weekEnd)) continue
      const list = map.get(event.employeeId)
      if (list) list.push(event)
      else map.set(event.employeeId, [event])
    }
    return map
  }, [events, weekStart, weekEnd])

  const weeklyMinutes = useMemo(() => {
    const totals = new Map<string, number>()
    for (const shift of shifts) {
      if (!isoDays.includes(shift.date)) continue
      totals.set(
        shift.employeeId,
        (totals.get(shift.employeeId) ?? 0) + workedMinutes(shift.start, shift.end, shift.breakMinutes),
      )
    }
    return totals
  }, [shifts, isoDays])

  const openCell = (employeeId: string, date: string) => {
    setEntryTarget({ employeeId, date })
    setEntryShift(null)
    setEntryEvent(null)
    setEntryOpen(true)
  }
  const openShift = (shift: Shift) => {
    setEntryTarget({ employeeId: shift.employeeId, date: shift.date })
    setEntryShift(shift)
    setEntryEvent(null)
    setEntryOpen(true)
  }
  const openEvent = (event: Event, date: string) => {
    setEntryTarget({ employeeId: event.employeeId, date })
    setEntryShift(null)
    setEntryEvent(event)
    setEntryOpen(true)
  }
  const goToProfile = (employeeId: string) => {
    navigate(`/personnel?employee=${employeeId}`)
  }

  const moveShift = (shift: Shift, target: DraftTarget) => {
    if (shift.employeeId === target.employeeId && shift.date === target.date) return
    upsertShift({ ...shift, employeeId: target.employeeId, date: target.date })
  }

  const onDragStart = (event: DragEvent<HTMLButtonElement>, shift: Shift) => {
    event.dataTransfer.setData('text/plain', shift.id)
    event.dataTransfer.effectAllowed = 'move'
    setDragging(shift.id)
  }
  const onDragEnd = () => {
    setDragging(null)
    setDropTarget(null)
  }
  const onDrop = (event: DragEvent<HTMLDivElement>, target: DraftTarget) => {
    event.preventDefault()
    const shiftId = event.dataTransfer.getData('text/plain')
    const shift = shifts.find((candidate) => candidate.id === shiftId)
    if (shift) moveShift(shift, target)
    setDragging(null)
    setDropTarget(null)
  }

  return (
    <div>
      <PageHeader
        title="Planning"
        subtitle={weekLabel(reference)}
        actions={
          <div className="flex items-center gap-2">
            <IconButton label="Semaine précédente" onClick={() => setReference((d) => addDays(d, -7))}>
              <IconChevronLeft size={18} />
            </IconButton>
            <Button variant="secondary" size="sm" onClick={() => setReference(new Date())}>
              Aujourd'hui
            </Button>
            <IconButton label="Semaine suivante" onClick={() => setReference((d) => addDays(d, 7))}>
              <IconChevronRight size={18} />
            </IconButton>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={teamFilter === 'all'} onClick={() => setTeamFilter('all')}>
          Toutes les équipes
        </FilterChip>
        {teams.map((team) => (
          <FilterChip key={team.id} active={teamFilter === team.id} onClick={() => setTeamFilter(team.id)}>
            {team.name}
          </FilterChip>
        ))}
      </div>

      {visibleEmployees.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconCalendar size={28} />}
            title="Aucune personne à planifier"
            description="Ajoute des membres dans Personnels, ou change le filtre d'équipe."
          />
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <div className="grid min-w-[960px] grid-cols-[200px_repeat(7,1fr)]">
            <div className="sticky left-0 z-10 border-r border-b border-hairline bg-surface-header" />
            {days.map((day) => (
              <div
                key={toIso(day)}
                className={`border-b border-hairline px-3 py-2.5 text-center ${isToday(day) ? 'bg-accent-soft' : 'bg-surface-header'}`}
              >
                <p className="text-label tracking-wide text-muted uppercase">{shortDayLabel(day)}</p>
                <p className={`tabular text-body-sm font-semibold ${isToday(day) ? 'text-accent' : 'text-ink'}`}>
                  {shortDateLabel(day)}
                </p>
              </div>
            ))}

            {visibleEmployees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                days={isoDays}
                dayDates={days}
                shiftsByCell={shiftsByCell}
                employeeEvents={eventsByEmployee.get(employee.id) ?? []}
                weeklyMinutes={weeklyMinutes.get(employee.id) ?? 0}
                dragging={dragging}
                dropTarget={dropTarget}
                onNameClick={goToProfile}
                onCellClick={openCell}
                onShiftClick={openShift}
                onEventClick={openEvent}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={setDropTarget}
                onDrop={onDrop}
              />
            ))}
          </div>
        </Panel>
      )}

      <PlanningEntryModal
        open={entryOpen}
        employeeId={entryTarget?.employeeId ?? ''}
        date={entryTarget?.date ?? ''}
        employees={visibleEmployees}
        templates={templates.filter((template) => !template.archived)}
        shift={entryShift}
        event={entryEvent}
        onClose={() => setEntryOpen(false)}
        onSaveShift={upsertShift}
        onDeleteShift={entryShift ? () => removeShift(entryShift.id) : undefined}
        onSaveEvent={upsertEvent}
        onDeleteEvent={entryEvent ? () => removeEvent(entryEvent.id) : undefined}
      />
    </div>
  )
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function EmployeeRow({
  employee,
  days,
  dayDates,
  shiftsByCell,
  employeeEvents,
  weeklyMinutes,
  dragging,
  dropTarget,
  onNameClick,
  onCellClick,
  onShiftClick,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  employee: Employee
  days: string[]
  dayDates: Date[]
  shiftsByCell: Map<string, Shift[]>
  employeeEvents: Event[]
  weeklyMinutes: number
  dragging: string | null
  dropTarget: DraftTarget | null
  onNameClick: (employeeId: string) => void
  onCellClick: (employeeId: string, date: string) => void
  onShiftClick: (shift: Shift) => void
  onEventClick: (event: Event, date: string) => void
  onDragStart: (event: DragEvent<HTMLButtonElement>, shift: Shift) => void
  onDragEnd: () => void
  onDragOver: (target: DraftTarget | null) => void
  onDrop: (event: DragEvent<HTMLDivElement>, target: DraftTarget) => void
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center gap-2.5 border-r border-b border-hairline bg-surface-1 px-3 py-2.5">
        <Avatar employee={employee} size={32} />
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onNameClick(employee.id)}
            className="truncate text-body-sm font-medium text-ink hover:text-accent hover:underline"
            title="Ouvrir la fiche"
          >
            {fullName(employee)}
          </button>
          <p className="tabular text-body-sm text-faint">
            {formatDuration(weeklyMinutes)}/{formatDuration(employee.contract.weeklyHours * 60)}
            {weeklyMinutes > employee.contract.weeklyHours * 60 ? (
              <span className="ml-1 text-critical-text">
                — Sup. +{formatDuration(weeklyMinutes - employee.contract.weeklyHours * 60)}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {days.map((date, index) => {
        const cellShifts = shiftsByCell.get(`${employee.id}|${date}`) ?? []
        const dayEvent = employeeEvents.find((event) => date >= event.startDate && date <= event.endDate)
        const isDropTarget = dropTarget?.employeeId === employee.id && dropTarget?.date === date
        const day = dayDates[index]

        return (
          <div
            key={date}
            role="button"
            tabIndex={0}
            aria-label={`Ajouter un créneau ou un événement — ${day ? longDateLabel(day) : date}`}
            onClick={() => onCellClick(employee.id, date)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onCellClick(employee.id, date)
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              onDragOver({ employeeId: employee.id, date })
            }}
            onDragLeave={() => onDragOver(null)}
            onDrop={(event) => onDrop(event, { employeeId: employee.id, date })}
            className={`flex min-h-20 flex-col gap-1 border-r border-b border-hairline p-1.5 last:border-r-0 ${
              isDropTarget ? 'border-2 border-dashed border-accent bg-accent-soft' : ''
            } ${dragging && !isDropTarget ? 'bg-surface-0' : ''}`}
          >
            {dayEvent ? (
              <EventBanner
                event={dayEvent}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation()
                  onEventClick(dayEvent, date)
                }}
              />
            ) : null}
            {cellShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                dimmed={dragging === shift.id}
                onClick={() => onShiftClick(shift)}
                onDragStart={(event) => onDragStart(event, shift)}
                onDragEnd={onDragEnd}
              />
            ))}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onCellClick(employee.id, date)
              }}
              title="Ajouter un créneau ou un événement"
              className={`flex items-center justify-center rounded-control text-faint transition-opacity hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100 ${
                cellShifts.length === 0 && !dayEvent ? 'flex-1 opacity-0' : 'h-6 opacity-40'
              }`}
            >
              <IconPlus size={14} />
            </button>
          </div>
        )
      })}
    </>
  )
}
