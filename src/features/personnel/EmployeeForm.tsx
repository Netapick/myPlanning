import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { CONTRACT_TYPES, FIXED_TERM_CONTRACTS, EMPLOYEE_STATUS_LABELS } from '@/lib/types'
import type { ContractType, Employee, EmployeeStatus, Team } from '@/lib/types'
import { toIso } from '@/lib/week'
import { newId } from '@/store/data'

/** Champs du formulaire — tout en texte, converti au moment d'enregistrer. */
interface FormState {
  firstName: string
  lastName: string
  email: string
  role: string
  department: string
  teamId: string
  contractType: ContractType
  weeklyHours: string
  startDate: string
  endDate: string
  status: EmployeeStatus
}

const emptyForm = (): FormState => ({
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  department: '',
  teamId: '',
  contractType: 'CDI',
  weeklyHours: '35',
  startDate: toIso(new Date()),
  endDate: '',
  status: 'actif',
})

const toForm = (employee: Employee): FormState => ({
  firstName: employee.firstName,
  lastName: employee.lastName,
  email: employee.email ?? '',
  role: employee.role,
  department: employee.department,
  teamId: employee.teamId ?? '',
  contractType: employee.contract.type,
  weeklyHours: String(employee.contract.weeklyHours),
  startDate: employee.contract.startDate,
  endDate: employee.contract.endDate ?? '',
  status: employee.status,
})

type Errors = Partial<Record<keyof FormState, string>>

const validate = (form: FormState): Errors => {
  const errors: Errors = {}
  if (!form.firstName.trim()) errors.firstName = 'Prénom obligatoire.'
  if (!form.lastName.trim()) errors.lastName = 'Nom obligatoire.'

  const hours = Number(form.weeklyHours.replace(',', '.'))
  if (!Number.isFinite(hours) || hours <= 0 || hours > 60) {
    errors.weeklyHours = 'Indique un quota entre 1 et 60 heures.'
  }
  if (!form.startDate) errors.startDate = 'Date de début obligatoire.'

  // La date de fin n'a de sens que sur un contrat à terme, et elle alimente
  // l'alerte de fin de contrat : autant la rendre obligatoire là où elle sert.
  if (FIXED_TERM_CONTRACTS.includes(form.contractType)) {
    if (!form.endDate) errors.endDate = 'Un contrat à durée déterminée a une date de fin.'
    else if (form.startDate && form.endDate < form.startDate)
      errors.endDate = 'La fin ne peut pas précéder le début.'
  }
  return errors
}

interface EmployeeFormProps {
  open: boolean
  /** `null` = création. */
  employee: Employee | null
  teams: Team[]
  onSave: (employee: Employee) => void
  onClose: () => void
}

export function EmployeeForm({ open, employee, teams, onSave, onClose }: EmployeeFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})

  // Le contenu est remis à plat à chaque ouverture : rouvrir « Ajouter » après
  // avoir édité quelqu'un ne doit pas ressortir ses valeurs.
  useEffect(() => {
    if (!open) return
    setForm(employee ? toForm(employee) : emptyForm())
    setErrors({})
  }, [open, employee])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const isFixedTerm = FIXED_TERM_CONTRACTS.includes(form.contractType)

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSave({
      id: employee?.id ?? newId(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      role: form.role.trim(),
      department: form.department.trim(),
      teamId: form.teamId || null,
      contract: {
        type: form.contractType,
        weeklyHours: Number(form.weeklyHours.replace(',', '.')),
        startDate: form.startDate,
        ...(isFixedTerm && form.endDate ? { endDate: form.endDate } : {}),
      },
      status: form.status,
      archived: employee?.archived ?? false,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      size="wide"
      title={employee ? 'Modifier la fiche' : 'Ajouter un membre'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{employee ? 'Enregistrer' : 'Ajouter'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Prénom"
          value={form.firstName}
          error={errors.firstName}
          onChange={(event) => set('firstName', event.target.value)}
        />
        <TextField
          label="Nom"
          value={form.lastName}
          error={errors.lastName}
          onChange={(event) => set('lastName', event.target.value)}
        />
        <TextField
          label="Poste"
          placeholder="ex. Infirmière"
          value={form.role}
          onChange={(event) => set('role', event.target.value)}
        />
        <TextField
          label="Service"
          placeholder="ex. Soins"
          value={form.department}
          onChange={(event) => set('department', event.target.value)}
        />
        <TextField
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(event) => set('email', event.target.value)}
        />
        <SelectField
          label="Équipe"
          value={form.teamId}
          onChange={(event) => set('teamId', event.target.value)}
        >
          <option value="">Sans équipe</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Type de contrat"
          value={form.contractType}
          onChange={(event) => set('contractType', event.target.value as ContractType)}
        >
          {CONTRACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Heures par semaine"
          type="number"
          min={1}
          max={60}
          step={0.5}
          value={form.weeklyHours}
          error={errors.weeklyHours}
          onChange={(event) => set('weeklyHours', event.target.value)}
        />
        <TextField
          label="Début du contrat"
          type="date"
          value={form.startDate}
          error={errors.startDate}
          onChange={(event) => set('startDate', event.target.value)}
        />
        {isFixedTerm ? (
          <TextField
            label="Fin du contrat"
            type="date"
            value={form.endDate}
            error={errors.endDate}
            hint="Déclenche l'alerte de fin de contrat."
            onChange={(event) => set('endDate', event.target.value)}
          />
        ) : (
          <div className="hidden sm:block" />
        )}

        <SelectField
          label="Statut"
          value={form.status}
          onChange={(event) => set('status', event.target.value as EmployeeStatus)}
        >
          {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]).map((status) => (
            <option key={status} value={status}>
              {EMPLOYEE_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      </div>
    </Modal>
  )
}
