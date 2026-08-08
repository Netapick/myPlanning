import { useMemo, useState, type DragEvent } from 'react'
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
import { formatHours, workedMinutes } from '@/lib/time'
import type { Employee, Shift } from '@/lib/types'
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
import { ShiftCard } from './ShiftCard'
import { ShiftForm } from './ShiftForm'

interface DraftTarget {
  employeeId: string
  date: string
}

/**
 * Planning hebdomadaire : grille Employé × 7 jours.
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
  const upsertShift = useDataStore((state) => state.upsertShift)
  const removeShift = useDataStore((state) => state.removeShift)

  const [reference, setReference] = useState(() => new Date())
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [editing, setEditing] = useState<Shift | null>(null)
  const [draft, setDraft] = useState<DraftTarget | null>(null)
  const [formOpen, setFormOpen] = useState(false)
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

  const openCreate = (employeeId: string, date: string) => {
    setEditing(null)
    setDraft({ employeeId, date })
    setFormOpen(true)
  }
  const openEdit = (shift: Shift) => {
    setEditing(shift)
    setDraft(null)
    setFormOpen(true)
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
            description="Ajoute des membres dans Personnel, ou change le filtre d'équipe."
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
                weeklyMinutes={weeklyMinutes.get(employee.id) ?? 0}
                dragging={dragging}
                dropTarget={dropTarget}
                onCellClick={openCreate}
                onShiftClick={openEdit}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={setDropTarget}
                onDrop={onDrop}
              />
            ))}
          </div>
        </Panel>
      )}

      <ShiftForm
        open={formOpen}
        shift={editing}
        draft={draft}
        employees={visibleEmployees}
        templates={templates.filter((template) => !template.archived)}
        onClose={() => setFormOpen(false)}
        onSave={upsertShift}
        onDelete={editing ? () => removeShift(editing.id) : undefined}
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
  weeklyMinutes,
  dragging,
  dropTarget,
  onCellClick,
  onShiftClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  employee: Employee
  days: string[]
  dayDates: Date[]
  shiftsByCell: Map<string, Shift[]>
  weeklyMinutes: number
  dragging: string | null
  dropTarget: DraftTarget | null
  onCellClick: (employeeId: string, date: string) => void
  onShiftClick: (shift: Shift) => void
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
          <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
          <p className="tabular text-body-sm text-faint">{formatHours(weeklyMinutes)}</p>
        </div>
      </div>

      {days.map((date, index) => {
        const cellShifts = shiftsByCell.get(`${employee.id}|${date}`) ?? []
        const isDropTarget = dropTarget?.employeeId === employee.id && dropTarget?.date === date
        const day = dayDates[index]

        return (
          <div
            key={date}
            role="button"
            tabIndex={0}
            aria-label={`Ajouter un créneau — ${day ? longDateLabel(day) : date}`}
            onClick={() => cellShifts.length === 0 && onCellClick(employee.id, date)}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && cellShifts.length === 0) {
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
            {cellShifts.length === 0 ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onCellClick(employee.id, date)
                }}
                className="flex flex-1 items-center justify-center rounded-control text-faint opacity-0 transition-opacity hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100"
              >
                <IconPlus size={16} />
              </button>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
