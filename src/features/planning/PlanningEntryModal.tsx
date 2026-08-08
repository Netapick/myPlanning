import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField, TimeField } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { isValidTime } from '@/lib/time'
import type { Employee, Event, EventType, Shift, ShiftTemplate } from '@/lib/types'
import { EVENT_TYPE_LABELS, fullName } from '@/lib/types'
import { longDateLabel, toIso } from '@/lib/week'
import { newId } from '@/store/data'

type Tab = 'shift' | 'event'

interface ShiftFormState {
  templateId: string
  start: string
  end: string
  breakMinutes: string
  label: string
  colorIndex: number
  note: string
}

interface EventFormState {
  type: EventType
  startDate: string
  endDate: string
  note: string
}

const fromTemplate = (
  template: ShiftTemplate,
): Pick<ShiftFormState, 'start' | 'end' | 'breakMinutes' | 'label' | 'colorIndex'> => ({
  start: template.start,
  end: template.end,
  breakMinutes: String(template.breakMinutes),
  label: template.name,
  colorIndex: template.colorIndex,
})

const emptyShiftForm = (templates: ShiftTemplate[]): ShiftFormState => {
  const first = templates[0]
  return {
    templateId: first?.id ?? '',
    start: first?.start ?? '09:00',
    end: first?.end ?? '17:00',
    breakMinutes: String(first?.breakMinutes ?? 0),
    label: first?.name ?? '',
    colorIndex: first?.colorIndex ?? 1,
    note: '',
  }
}

const shiftToForm = (shift: Shift): ShiftFormState => ({
  templateId: shift.templateId ?? '',
  start: shift.start,
  end: shift.end,
  breakMinutes: String(shift.breakMinutes),
  label: shift.label,
  colorIndex: shift.colorIndex,
  note: shift.note ?? '',
})

const emptyEventForm = (date: string): EventFormState => ({
  type: 'conges',
  startDate: date,
  endDate: date,
  note: '',
})

const eventToForm = (event: Event): EventFormState => ({
  type: event.type,
  startDate: event.startDate,
  endDate: event.endDate,
  note: event.note ?? '',
})

type ShiftErrors = Partial<Record<'label' | 'start' | 'end' | 'breakMinutes', string>>
type EventErrors = Partial<Record<'startDate' | 'endDate', string>>

const validateShift = (form: ShiftFormState): ShiftErrors => {
  const errors: ShiftErrors = {}
  if (!form.label.trim()) errors.label = 'Nom obligatoire.'
  if (!isValidTime(form.start)) errors.start = 'Heure invalide.'
  if (!isValidTime(form.end)) errors.end = 'Heure invalide.'
  const brk = Number(form.breakMinutes)
  if (!Number.isFinite(brk) || brk < 0 || brk > 240) errors.breakMinutes = 'Entre 0 et 240 minutes.'
  return errors
}

const validateEvent = (form: EventFormState): EventErrors => {
  const errors: EventErrors = {}
  if (!form.startDate) errors.startDate = 'Date de début obligatoire.'
  if (!form.endDate) errors.endDate = 'Date de fin obligatoire.'
  else if (form.startDate && form.endDate < form.startDate) {
    errors.endDate = 'La fin ne peut pas précéder le début.'
  }
  return errors
}

interface PlanningEntryModalProps {
  open: boolean
  employeeId: string
  date: string
  employees: Employee[]
  templates: ShiftTemplate[]
  /** Créneau existant à éditer — ouvre directement sur l'onglet Créneau. */
  shift: Shift | null
  /** Événement existant à éditer — ouvre directement sur l'onglet Événement. */
  event: Event | null
  onSaveShift: (shift: Shift) => void
  onDeleteShift?: () => void
  onSaveEvent: (event: Event) => void
  onDeleteEvent?: () => void
  onClose: () => void
}

/**
 * Modal unique du planning, à deux onglets : Créneau et Événement. Cliquer
 * sur une case (vide ou déjà remplie) ouvre les deux, l'onglet par défaut
 * dépendant de ce qui s'y trouve déjà — pas besoin de repasser par Personnel
 * pour poser une absence directement depuis la grille.
 */
export function PlanningEntryModal({
  open,
  employeeId,
  date,
  employees,
  templates,
  shift,
  event,
  onSaveShift,
  onDeleteShift,
  onSaveEvent,
  onDeleteEvent,
  onClose,
}: PlanningEntryModalProps) {
  const [tab, setTab] = useState<Tab>('shift')
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() => emptyShiftForm(templates))
  const [shiftErrors, setShiftErrors] = useState<ShiftErrors>({})
  const [eventForm, setEventForm] = useState<EventFormState>(() => emptyEventForm(toIso(new Date())))
  const [eventErrors, setEventErrors] = useState<EventErrors>({})
  const [confirmDeleteShift, setConfirmDeleteShift] = useState(false)
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false)

  useEffect(() => {
    if (!open) return
    setTab(event ? 'event' : 'shift')
    setShiftForm(shift ? shiftToForm(shift) : emptyShiftForm(templates))
    setEventForm(event ? eventToForm(event) : emptyEventForm(date))
    setShiftErrors({})
    setEventErrors({})
    setConfirmDeleteShift(false)
    setConfirmDeleteEvent(false)
    // `templates` change trop souvent (chaque frappe du formulaire de tranche
    // horaire) pour être une dépendance fiable ici — on ne veut resynchroniser
    // qu'à l'ouverture, pas à chaque rendu du parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift, event, date])

  const setShift = <K extends keyof ShiftFormState>(key: K, value: ShiftFormState[K]) =>
    setShiftForm((current) => ({ ...current, [key]: value }))
  const setEventField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) =>
    setEventForm((current) => ({ ...current, [key]: value }))

  const applyTemplate = (templateId: string) => {
    const template = templates.find((candidate) => candidate.id === templateId)
    setShiftForm((current) => ({
      ...current,
      templateId,
      ...(template ? fromTemplate(template) : {}),
    }))
  }

  const submitShift = () => {
    const found = validateShift(shiftForm)
    setShiftErrors(found)
    if (Object.keys(found).length > 0) return

    onSaveShift({
      id: shift?.id ?? newId(),
      employeeId,
      date,
      templateId: shiftForm.templateId || null,
      start: shiftForm.start,
      end: shiftForm.end,
      breakMinutes: Number(shiftForm.breakMinutes),
      label: shiftForm.label.trim(),
      colorIndex: shiftForm.colorIndex,
      ...(shiftForm.note.trim() ? { note: shiftForm.note.trim() } : {}),
    })
    onClose()
  }

  const submitEvent = () => {
    const found = validateEvent(eventForm)
    setEventErrors(found)
    if (Object.keys(found).length > 0) return

    onSaveEvent({
      id: event?.id ?? newId(),
      employeeId,
      type: eventForm.type,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      ...(eventForm.note.trim() ? { note: eventForm.note.trim() } : {}),
    })
    onClose()
  }

  const employee = employees.find((candidate) => candidate.id === employeeId)
  const crossesMidnight =
    isValidTime(shiftForm.start) && isValidTime(shiftForm.end) && shiftForm.end <= shiftForm.start

  const TABS: { key: Tab; label: string }[] = [
    { key: 'shift', label: 'Créneau' },
    { key: 'event', label: 'Événement' },
  ]

  return (
    <Modal
      open={open}
      title={employee ? fullName(employee) : 'Planning'}
      onClose={onClose}
      footer={
        tab === 'shift' ? (
          <>
            {shift && onDeleteShift ? (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirmDeleteShift(true)}>
                Supprimer
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={submitShift}>{shift ? 'Enregistrer' : 'Ajouter'}</Button>
          </>
        ) : (
          <>
            {event && onDeleteEvent ? (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirmDeleteEvent(true)}>
                Supprimer
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={submitEvent}>{event ? 'Enregistrer' : 'Ajouter'}</Button>
          </>
        )
      }
    >
      <p className="mb-4 text-body-sm text-muted">
        {date ? longDateLabel(new Date(`${date}T12:00:00`)) : ''}
      </p>

      <div className="mb-4 flex gap-1 border-b border-hairline">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-2 text-body-sm font-medium transition-colors ${
              tab === key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'shift' ? (
        <div className="flex flex-col gap-4">
          {templates.length > 0 ? (
            <SelectField
              label="Tranche horaire"
              value={shiftForm.templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">Personnalisé</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.start}-{template.end})
                </option>
              ))}
            </SelectField>
          ) : null}

          <TextField
            label="Nom du créneau"
            value={shiftForm.label}
            error={shiftErrors.label}
            onChange={(e) => setShift('label', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <TimeField
              label="Début"
              value={shiftForm.start}
              error={shiftErrors.start}
              onChange={(e) => setShift('start', e.target.value)}
            />
            <TimeField
              label="Fin"
              value={shiftForm.end}
              error={shiftErrors.end}
              hint={crossesMidnight ? 'Passe minuit' : undefined}
              onChange={(e) => setShift('end', e.target.value)}
            />
          </div>

          <TextField
            label="Pause (minutes)"
            type="number"
            min={0}
            max={240}
            step={5}
            value={shiftForm.breakMinutes}
            error={shiftErrors.breakMinutes}
            onChange={(e) => setShift('breakMinutes', e.target.value)}
          />

          <TextField
            label="Note"
            placeholder="Facultatif"
            value={shiftForm.note}
            onChange={(e) => setShift('note', e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SelectField
            label="Type"
            value={eventForm.type}
            onChange={(e) => setEventField('type', e.target.value as EventType)}
          >
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Du"
              type="date"
              value={eventForm.startDate}
              error={eventErrors.startDate}
              onChange={(e) => setEventField('startDate', e.target.value)}
            />
            <TextField
              label="Au"
              type="date"
              value={eventForm.endDate}
              error={eventErrors.endDate}
              onChange={(e) => setEventField('endDate', e.target.value)}
            />
          </div>

          <TextField
            label="Note"
            placeholder="Facultatif"
            value={eventForm.note}
            onChange={(e) => setEventField('note', e.target.value)}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteShift}
        title="Supprimer ce créneau ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setConfirmDeleteShift(false)}
        onConfirm={() => {
          onDeleteShift?.()
          setConfirmDeleteShift(false)
          onClose()
        }}
      />

      <ConfirmDialog
        open={confirmDeleteEvent}
        title="Supprimer cet événement ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setConfirmDeleteEvent(false)}
        onConfirm={() => {
          onDeleteEvent?.()
          setConfirmDeleteEvent(false)
          onClose()
        }}
      />
    </Modal>
  )
}
