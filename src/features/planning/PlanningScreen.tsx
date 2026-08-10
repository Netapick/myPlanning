import { useMemo, useState, type DragEvent } from 'react'
import { Avatar, FilterChip } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconPlus,
  IconPrinter,
} from '@/components/ui/icons'
import { employeeBalances, type EmployeeBalances } from '@/lib/balances'
import { downloadCsv } from '@/lib/csv'
import { dateRangesOverlap } from '@/lib/events'
import { publicHolidayName } from '@/lib/holidays'
import { colorVar } from '@/lib/palette'
import { formatDuration, formatSignedDuration, spanMinutes } from '@/lib/time'
import type { Employee, Event, Shift } from '@/lib/types'
import { compareEmployeeNames, EVENT_TYPE_LABELS, fullName } from '@/lib/types'
import {
  fromIsoWeekValue,
  isToday,
  isoWeekValue,
  longDateLabel,
  shortDateLabel,
  shortDayLabel,
  toIso,
  weekDays,
  weekLabel,
  weekNumber,
} from '@/lib/week'
import {
  EMPTY_EMPLOYEES,
  EMPTY_EVENTS,
  EMPTY_SHIFT_TEMPLATES,
  EMPTY_SHIFTS,
  EMPTY_TEAMS,
  useDataStore,
} from '@/store/data'
import { useUiStore } from '@/store/ui'
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
  const employees = useDataStore((state) => state.document?.employees ?? EMPTY_EMPLOYEES)
  const teams = useDataStore((state) => state.document?.teams ?? EMPTY_TEAMS)
  const templates = useDataStore((state) => state.document?.shiftTemplates ?? EMPTY_SHIFT_TEMPLATES)
  const shifts = useDataStore((state) => state.document?.shifts ?? EMPTY_SHIFTS)
  const events = useDataStore((state) => state.document?.events ?? EMPTY_EVENTS)
  const upsertShift = useDataStore((state) => state.upsertShift)
  const removeShift = useDataStore((state) => state.removeShift)
  const upsertEvent = useDataStore((state) => state.upsertEvent)
  const removeEvent = useDataStore((state) => state.removeEvent)
  const search = useUiStore((state) => state.search)

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

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees
      .filter((employee) => !employee.archived)
      .filter((employee) => teamFilter === 'all' || employee.teamId === teamFilter)
      .filter((employee) => {
        if (!query) return true
        const haystack = `${fullName(employee)} ${employee.role}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort(compareEmployeeNames)
  }, [employees, teamFilter, search])

  // Soldes RH par personne — calculés sur l'ensemble des événements (pas
  // seulement ceux de la semaine affichée), pour le panneau de lecture seule.
  const balancesByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeBalances>()
    for (const employee of visibleEmployees) map.set(employee.id, employeeBalances(employee, events, shifts))
    return map
  }, [visibleEmployees, events, shifts])

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
        (totals.get(shift.employeeId) ?? 0) + spanMinutes(shift.start, shift.end),
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

  const exportCsv = () => {
    const rows: string[][] = [['Employé', 'Date', 'Type', 'Horaire / Note']]
    for (const employee of visibleEmployees) {
      for (const date of isoDays) {
        const cellShifts = shiftsByCell.get(`${employee.id}|${date}`) ?? []
        for (const shift of cellShifts) {
          rows.push([
            fullName(employee),
            date,
            shift.label,
            `${shift.start}-${shift.end}${shift.note ? ` — ${shift.note}` : ''}`,
          ])
        }
      }
      for (const event of eventsByEmployee.get(employee.id) ?? []) {
        rows.push([
          fullName(employee),
          event.startDate === event.endDate ? event.startDate : `${event.startDate} → ${event.endDate}`,
          EVENT_TYPE_LABELS[event.type],
          event.note ?? '',
        ])
      }
    }
    downloadCsv(`planning-${isoDays[0]}-au-${isoDays[isoDays.length - 1]}.csv`, rows)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Planning"
        subtitle={`${weekLabel(reference)} · S${weekNumber(reference)}`}
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
            <input
              type="week"
              aria-label="Aller à une semaine précise"
              title="Aller à une semaine précise"
              value={isoWeekValue(reference)}
              onChange={(event) => {
                const target = fromIsoWeekValue(event.target.value)
                if (target) setReference(target)
              }}
              className="h-9 rounded-control border border-hairline bg-surface-1 px-2.5 text-body-sm text-ink field-focus"
            />
            <IconButton label="Exporter la semaine en CSV" onClick={exportCsv}>
              <IconDownload size={18} />
            </IconButton>
            <IconButton label="Imprimer la semaine" onClick={() => window.print()}>
              <IconPrinter size={18} />
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
        <Panel className="print-area flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Visible uniquement à l'impression : le reste de l'en-tête (titre,
              navigation) vit hors de `.print-area` et disparaît sur papier —
              sans ça, la feuille imprimée ne dit plus de quelle semaine il
              s'agit une fois l'en-tête du navigateur aussi supprimé. */}
          <div className="hidden print:block mb-1">
            <p className="text-headline-md font-bold text-ink">Planning Weldom Cosne sur Loire</p>
            <p className="text-body-md text-muted">
              {weekLabel(reference)} · S{weekNumber(reference)}
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="grid w-full grid-cols-[minmax(140px,200px)_repeat(7,minmax(0,1fr))]">
              <div className="sticky left-0 z-10 border-r border-b border-hairline bg-surface-header" />
              {days.map((day) => {
                const iso = toIso(day)
                const today = isToday(day)
                const holidayName = publicHolidayName(iso)
                return (
                  <div
                    key={iso}
                    className={`border-b border-hairline px-3 py-2.5 text-center print:py-0.5 ${
                      today ? 'bg-accent-soft' : holidayName ? '' : 'bg-surface-header'
                    }`}
                    style={
                      !today && holidayName
                        ? { backgroundColor: `color-mix(in srgb, ${colorVar(6)} 16%, var(--surface-header))` }
                        : undefined
                    }
                  >
                    <p className="text-label tracking-wide text-muted uppercase">{shortDayLabel(day)}</p>
                    <p className={`tabular text-body-sm font-semibold ${today ? 'text-accent' : 'text-ink'}`}>
                      {shortDateLabel(day)}
                    </p>
                    {holidayName ? (
                      <p
                        className="truncate text-label"
                        style={{ color: colorVar(6) }}
                        title={holidayName}
                      >
                        {holidayName}
                      </p>
                    ) : null}
                  </div>
                )
              })}

              {visibleEmployees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  days={isoDays}
                  dayDates={days}
                  shiftsByCell={shiftsByCell}
                  employeeEvents={eventsByEmployee.get(employee.id) ?? []}
                  weeklyMinutes={weeklyMinutes.get(employee.id) ?? 0}
                  balances={balancesByEmployee.get(employee.id) ?? null}
                  dragging={dragging}
                  dropTarget={dropTarget}
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
  balances,
  dragging,
  dropTarget,
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
  balances: EmployeeBalances | null
  dragging: string | null
  dropTarget: DraftTarget | null
  onCellClick: (employeeId: string, date: string) => void
  onShiftClick: (shift: Shift) => void
  onEventClick: (event: Event, date: string) => void
  onDragStart: (event: DragEvent<HTMLButtonElement>, shift: Shift) => void
  onDragEnd: () => void
  onDragOver: (target: DraftTarget | null) => void
  onDrop: (event: DragEvent<HTMLDivElement>, target: DraftTarget) => void
}) {
  const openEmployeeProfile = useUiStore((state) => state.openEmployeeProfile)

  return (
    <>
      <div className="group sticky left-0 z-10 flex items-center gap-2.5 border-r border-b border-hairline bg-surface-1 px-3 py-2.5 hover:z-30 print:py-1">
        <span className="no-print">
          <Avatar employee={employee} size={32} />
        </span>
        {/* Vue lecture seule uniquement : le planning ne navigue plus vers la
            fiche employé (voir Personnels pour éditer). Un survol du nom
            affiche un résumé — poste, contrat, soldes RH.
            `hover:z-30` sur la ligne (pas juste le panneau) : chaque ligne
            `sticky` forme son propre contexte d'empilement, donc un simple
            z-index sur le panneau ne suffit pas à passer devant la ligne
            suivante — il faut faire remonter toute la ligne survolée. */}
        <div className="relative min-w-0">
          <p className="truncate text-body-sm font-medium text-ink">{fullName(employee)}</p>
          <p className="tabular text-body-sm text-faint">
            {formatDuration(weeklyMinutes)}/{formatDuration(employee.contract.weeklyHours * 60)}
            {weeklyMinutes > employee.contract.weeklyHours * 60 ? (
              <span className="ml-1 text-critical-text">
                — Sup. +{formatDuration(weeklyMinutes - employee.contract.weeklyHours * 60)}
              </span>
            ) : null}
          </p>

          {/* `pointer-events-none` retiré ici : contrairement au reste du
              panneau (purement informatif), le lien vers la fiche doit rester
              cliquable. Le panneau reste un descendant du `group` survolé
              (la ligne sticky) même une fois positionné hors de sa boîte,
              donc y déplacer le curseur ne le referme pas. */}
          <div className="no-print absolute top-full left-0 z-20 mt-1 w-56 rounded-panel border border-hairline bg-surface-1 p-3 opacity-0 shadow-overlay transition-opacity group-hover:opacity-100">
            <p className="text-body-sm font-semibold text-ink">{fullName(employee)}</p>
            <p className="text-body-sm text-muted">{employee.role || 'Poste non renseigné'}</p>
            <p className="tabular text-body-sm text-muted">
              {employee.contract.type} · {employee.contract.weeklyHours} h/sem
            </p>
            {balances ? (
              <p className="tabular mt-2 text-body-sm text-faint">
                CP restants : {balances.leaveRemaining} j
                <br />
                Heures sup. : {formatSignedDuration(balances.overtimeRemainingMinutes)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => openEmployeeProfile(employee.id)}
              className="mt-3 block text-body-sm font-medium text-accent hover:underline"
            >
              Voir la fiche →
            </button>
          </div>
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
            className={`flex min-h-20 min-w-0 flex-col gap-1 border-r border-b border-hairline p-1.5 last:border-r-0 print:min-h-0 print:gap-0 print:px-1 print:py-0.5 ${
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
              className={`no-print flex items-center justify-center rounded-control text-faint transition-opacity hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100 ${
                cellShifts.length === 0 && !dayEvent ? 'flex-1 opacity-0' : 'h-6 opacity-0'
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
