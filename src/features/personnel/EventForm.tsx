import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Field'
import type { Employee, Event, EventType } from '@/lib/types'
import { EVENT_TYPE_LABELS, fullName } from '@/lib/types'
import { toIso } from '@/lib/week'
import { newId } from '@/store/data'

interface FormState {
  employeeId: string
  type: EventType
  startDate: string
  endDate: string
  note: string
}

const emptyForm = (employeeId: string): FormState => ({
  employeeId,
  type: 'conges',
  startDate: toIso(new Date()),
  endDate: toIso(new Date()),
  note: '',
})

const toForm = (event: Event): FormState => ({
  employeeId: event.employeeId,
  type: event.type,
  startDate: event.startDate,
  endDate: event.endDate,
  note: event.note ?? '',
})

type Errors = Partial<Record<'employeeId' | 'startDate' | 'endDate', string>>

const validate = (form: FormState): Errors => {
  const errors: Errors = {}
  if (!form.employeeId) errors.employeeId = 'Choisis une personne.'
  if (!form.startDate) errors.startDate = 'Date de début obligatoire.'
  if (!form.endDate) errors.endDate = 'Date de fin obligatoire.'
  else if (form.startDate && form.endDate < form.startDate) {
    errors.endDate = 'La fin ne peut pas précéder le début.'
  }
  return errors
}

interface EventFormProps {
  open: boolean
  /** Événement existant à éditer, ou `null` pour une création. */
  event: Event | null
  employees: Employee[]
  /** Pré-sélectionne la personne à la création (depuis sa fiche). */
  defaultEmployeeId?: string
  onSave: (event: Event) => void
  onDelete?: () => void
  onClose: () => void
}

/**
 * Formulaire d'événement — absences (congés, maladie, maternité…), formation,
 * ou autre. Distinct du formulaire de créneau : un événement couvre une
 * période de jours, pas un horaire.
 */
export function EventForm({
  open,
  event,
  employees,
  defaultEmployeeId,
  onSave,
  onDelete,
  onClose,
}: EventFormProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultEmployeeId ?? ''))
  const [errors, setErrors] = useState<Errors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(event ? toForm(event) : emptyForm(defaultEmployeeId ?? ''))
    setErrors({})
    setConfirmDelete(false)
  }, [open, event, defaultEmployeeId])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSave({
      id: event?.id ?? newId(),
      employeeId: form.employeeId,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      title={event ? "Modifier l'événement" : 'Nouvel événement'}
      onClose={onClose}
      footer={
        <>
          {event && onDelete ? (
            <Button variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{event ? 'Enregistrer' : 'Ajouter'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField
          label="Personne"
          value={form.employeeId}
          error={errors.employeeId}
          onChange={(e) => set('employeeId', e.target.value)}
        >
          <option value="">Choisir…</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {fullName(employee)}
            </option>
          ))}
        </SelectField>

        <SelectField label="Type" value={form.type} onChange={(e) => set('type', e.target.value as EventType)}>
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
            value={form.startDate}
            error={errors.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
          <TextField
            label="Au"
            type="date"
            value={form.endDate}
            error={errors.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>

        <TextField
          label="Note"
          placeholder="Facultatif"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cet événement ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete?.()
          setConfirmDelete(false)
          onClose()
        }}
      />
    </Modal>
  )
}
