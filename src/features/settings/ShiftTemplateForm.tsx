import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField, TimeField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { colorVar, PALETTE_LABELS, PALETTE_SIZE } from '@/lib/palette'
import { isValidTime } from '@/lib/time'
import type { ShiftTemplate } from '@/lib/types'
import { newId } from '@/store/data'

interface FormState {
  name: string
  start: string
  end: string
  colorIndex: number
}

const toForm = (template: ShiftTemplate | null, defaultColor: number): FormState => ({
  name: template?.name ?? '',
  start: template?.start ?? '09:00',
  end: template?.end ?? '17:00',
  colorIndex: template?.colorIndex ?? defaultColor,
})

type Errors = Partial<Record<keyof FormState, string>>

const validate = (form: FormState): Errors => {
  const errors: Errors = {}
  if (!form.name.trim()) errors.name = 'Nom obligatoire.'
  if (!isValidTime(form.start)) errors.start = 'Heure invalide.'
  if (!isValidTime(form.end)) errors.end = 'Heure invalide.'
  return errors
}

interface ShiftTemplateFormProps {
  open: boolean
  template: ShiftTemplate | null
  defaultColor: number
  onSave: (template: ShiftTemplate) => void
  onClose: () => void
}

export function ShiftTemplateForm({
  open,
  template,
  defaultColor,
  onSave,
  onClose,
}: ShiftTemplateFormProps) {
  const [form, setForm] = useState<FormState>(() => toForm(template, defaultColor))
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    if (!open) return
    setForm(toForm(template, defaultColor))
    setErrors({})
  }, [open, template, defaultColor])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSave({
      id: template?.id ?? newId(),
      name: form.name.trim(),
      start: form.start,
      end: form.end,
      colorIndex: form.colorIndex,
      archived: template?.archived ?? false,
    })
    onClose()
  }

  const crossesMidnight = isValidTime(form.start) && isValidTime(form.end) && form.end <= form.start

  return (
    <Modal
      open={open}
      title={template ? 'Modifier la tranche horaire' : 'Nouvelle tranche horaire'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{template ? 'Enregistrer' : 'Créer'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nom"
          placeholder="ex. Matin"
          value={form.name}
          error={errors.name}
          onChange={(event) => set('name', event.target.value)}
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
        <div>
          <p className="mb-1.5 text-label tracking-wide text-muted uppercase">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: PALETTE_SIZE }, (_, i) => i + 1).map((index) => (
              <button
                key={index}
                type="button"
                aria-label={PALETTE_LABELS[index - 1]}
                aria-pressed={form.colorIndex === index}
                onClick={() => set('colorIndex', index)}
                className={`h-8 w-8 rounded-full transition-shadow ${
                  form.colorIndex === index ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface-1' : ''
                }`}
                style={{ backgroundColor: colorVar(index) }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
