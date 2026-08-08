import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField, TimeField } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { isValidTime } from '@/lib/time'
import type { Employee, Shift, ShiftTemplate } from '@/lib/types'
import { fullName } from '@/lib/types'
import { longDateLabel } from '@/lib/week'
import { newId } from '@/store/data'

interface FormState {
  employeeId: string
  templateId: string
  start: string
  end: string
  breakMinutes: string
  label: string
  colorIndex: number
  note: string
}

const fromTemplate = (template: ShiftTemplate): Pick<FormState, 'start' | 'end' | 'breakMinutes' | 'label' | 'colorIndex'> => ({
  start: template.start,
  end: template.end,
  breakMinutes: String(template.breakMinutes),
  label: template.name,
  colorIndex: template.colorIndex,
})

const emptyForm = (employeeId: string, templates: ShiftTemplate[]): FormState => {
  const first = templates[0]
  return {
    employeeId,
    templateId: first?.id ?? '',
    start: first?.start ?? '09:00',
    end: first?.end ?? '17:00',
    breakMinutes: String(first?.breakMinutes ?? 0),
    label: first?.name ?? '',
    colorIndex: first?.colorIndex ?? 1,
    note: '',
  }
}

const toForm = (shift: Shift): FormState => ({
  employeeId: shift.employeeId,
  templateId: shift.templateId ?? '',
  start: shift.start,
  end: shift.end,
  breakMinutes: String(shift.breakMinutes),
  label: shift.label,
  colorIndex: shift.colorIndex,
  note: shift.note ?? '',
})

type Errors = Partial<Record<'label' | 'start' | 'end' | 'breakMinutes', string>>

const validate = (form: FormState): Errors => {
  const errors: Errors = {}
  if (!form.label.trim()) errors.label = 'Nom obligatoire.'
  if (!isValidTime(form.start)) errors.start = 'Heure invalide.'
  if (!isValidTime(form.end)) errors.end = 'Heure invalide.'
  const brk = Number(form.breakMinutes)
  if (!Number.isFinite(brk) || brk < 0 || brk > 240) errors.breakMinutes = 'Entre 0 et 240 minutes.'
  return errors
}

interface ShiftFormProps {
  open: boolean
  /** Créneau existant à éditer, ou coordonnées d'une case vide à remplir. */
  shift: Shift | null
  draft: { employeeId: string; date: string } | null
  employees: Employee[]
  templates: ShiftTemplate[]
  onSave: (shift: Shift, date: string) => void
  onDelete?: () => void
  onClose: () => void
}

export function ShiftForm({
  open,
  shift,
  draft,
  employees,
  templates,
  onSave,
  onDelete,
  onClose,
}: ShiftFormProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(draft?.employeeId ?? '', templates))
  const [errors, setErrors] = useState<Errors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(shift ? toForm(shift) : emptyForm(draft?.employeeId ?? '', templates))
    setErrors({})
    setConfirmDelete(false)
    // `templates` change trop souvent (chaque frappe du formulaire de tranche
    // horaire) pour être une dépendance fiable ici — on ne veut resynchroniser
    // qu'à l'ouverture, pas à chaque rendu du parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift, draft])

  const date = shift?.date ?? draft?.date ?? ''
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const applyTemplate = (templateId: string) => {
    const template = templates.find((candidate) => candidate.id === templateId)
    setForm((current) => ({
      ...current,
      templateId,
      ...(template ? fromTemplate(template) : {}),
    }))
  }

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSave(
      {
        id: shift?.id ?? newId(),
        employeeId: form.employeeId,
        date,
        templateId: form.templateId || null,
        start: form.start,
        end: form.end,
        breakMinutes: Number(form.breakMinutes),
        label: form.label.trim(),
        colorIndex: form.colorIndex,
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      },
      date,
    )
    onClose()
  }

  const employee = employees.find((candidate) => candidate.id === form.employeeId)
  const crossesMidnight = isValidTime(form.start) && isValidTime(form.end) && form.end <= form.start

  return (
    <Modal
      open={open}
      title={shift ? 'Modifier le créneau' : 'Nouveau créneau'}
      onClose={onClose}
      footer={
        <>
          {shift && onDelete ? (
            <Button variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{shift ? 'Enregistrer' : 'Ajouter'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-muted">
          {employee ? fullName(employee) : '—'}
          {date ? ` · ${longDateLabel(new Date(`${date}T12:00:00`))}` : ''}
        </p>

        {templates.length > 0 ? (
          <SelectField
            label="Tranche horaire"
            value={form.templateId}
            onChange={(event) => applyTemplate(event.target.value)}
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
          value={form.label}
          error={errors.label}
          onChange={(event) => set('label', event.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <TimeField
            label="Début"
            value={form.start}
            error={errors.start}
            onChange={(event) => set('start', event.target.value)}
          />
          <TimeField
            label="Fin"
            value={form.end}
            error={errors.end}
            hint={crossesMidnight ? 'Passe minuit' : undefined}
            onChange={(event) => set('end', event.target.value)}
          />
        </div>

        <TextField
          label="Pause (minutes)"
          type="number"
          min={0}
          max={240}
          step={5}
          value={form.breakMinutes}
          error={errors.breakMinutes}
          onChange={(event) => set('breakMinutes', event.target.value)}
        />

        <TextField
          label="Note"
          placeholder="Facultatif"
          value={form.note}
          onChange={(event) => set('note', event.target.value)}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce créneau ?"
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
