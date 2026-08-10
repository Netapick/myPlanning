import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmployeeCharts } from './EmployeeCharts'
import { employeeBalances } from '@/lib/balances'
import { formatDuration, formatSignedDuration } from '@/lib/time'
import {
  CONTRACT_TYPES,
  EVENT_TYPE_LABELS,
  FIXED_TERM_CONTRACTS,
  EMPLOYEE_STATUS_LABELS,
} from '@/lib/types'
import type { ContractType, Employee, EmployeeStatus, Event, Shift, Team } from '@/lib/types'
import { longDateLabel, toIso } from '@/lib/week'
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
  /** Jours de CP acquis — solde de départ, ajusté manuellement. */
  leaveAccrued: string
  /** Solde d'heures sup. à récupérer, saisi en heures décimales pour rester lisible. */
  overtimeHours: string
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
  leaveAccrued: '0',
  overtimeHours: '0',
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
  leaveAccrued: String(employee.leaveBalance.accrued),
  overtimeHours: String(employee.overtimeBalanceMinutes / 60),
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

  const leaveAccrued = Number(form.leaveAccrued.replace(',', '.'))
  if (!Number.isFinite(leaveAccrued) || leaveAccrued < 0) {
    errors.leaveAccrued = 'Indique un nombre de jours positif.'
  }
  const overtimeHours = Number(form.overtimeHours.replace(',', '.'))
  if (!Number.isFinite(overtimeHours)) errors.overtimeHours = 'Indique un nombre d’heures valide.'

  return errors
}

interface EmployeeFormProps {
  open: boolean
  /** `null` = création. */
  employee: Employee | null
  teams: Team[]
  /** Tous les événements de la personne — soldes calculés et liste affichée en mode édition. */
  events: Event[]
  /** Tous les créneaux de la personne — graphiques du mode « Affichage avancé ». */
  shifts: Shift[]
  onSave: (employee: Employee) => void
  onClose: () => void
}

export function EmployeeForm({ open, employee, teams, events, shifts, onSave, onClose }: EmployeeFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [advanced, setAdvanced] = useState(false)

  // Le contenu est remis à plat à chaque ouverture : rouvrir « Ajouter » après
  // avoir édité quelqu'un ne doit pas ressortir ses valeurs.
  useEffect(() => {
    if (!open) return
    setForm(employee ? toForm(employee) : emptyForm())
    setErrors({})
    setAdvanced(false)
  }, [open, employee])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const isFixedTerm = FIXED_TERM_CONTRACTS.includes(form.contractType)

  const employeeEvents = useMemo(
    () =>
      employee
        ? events
            .filter((event) => event.employeeId === employee.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate))
        : [],
    [events, employee],
  )

  const balances = useMemo(
    () => (employee ? employeeBalances(employee, events, shifts) : null),
    [employee, events, shifts],
  )

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
      leaveBalance: { accrued: Number(form.leaveAccrued.replace(',', '.')) },
      overtimeBalanceMinutes: Math.round(Number(form.overtimeHours.replace(',', '.')) * 60),
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      size="wide"
      title={employee ? 'Modifier la fiche' : 'Ajouter un personnel'}
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
      {employee ? (
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-hairline pb-4">
          <p className="text-body-sm text-muted">
            {advanced
              ? 'Historique et graphiques détaillés.'
              : 'Champs essentiels et soldes résumés.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setAdvanced((current) => !current)}>
            {advanced ? 'Affichage simple' : 'Affichage avancé'}
          </Button>
        </div>
      ) : null}

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

        <TextField
          label="CP acquis (jours)"
          type="number"
          min={0}
          step={0.5}
          value={form.leaveAccrued}
          error={errors.leaveAccrued}
          hint="Solde ajusté à la main, jamais calculé automatiquement."
          onChange={(event) => set('leaveAccrued', event.target.value)}
        />
        <TextField
          label="Heures sup. à récupérer (solde)"
          type="number"
          step={0.5}
          value={form.overtimeHours}
          error={errors.overtimeHours}
          hint="En heures, peut être négatif."
          onChange={(event) => set('overtimeHours', event.target.value)}
        />
      </div>

      {employee && balances ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <h3 className="mb-2 text-label tracking-wide text-muted uppercase">Soldes RH</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BalanceStat label="CP restants" value={`${balances.leaveRemaining} j`} sub={`${balances.leaveTaken} j posés`} />
            <BalanceStat
              label="Heures sup. restantes"
              value={formatSignedDuration(balances.overtimeRemainingMinutes)}
              sub={`+${formatDuration(balances.overtimeAccruedMinutes)} cumulées · +${formatDuration(balances.overtimeHolidayCreditMinutes)} fériés · -${formatDuration(balances.overtimeRecoveredMinutes)} récup. HS · -${formatDuration(balances.holidayRecoveryMinutes)} récup. férié`}
            />
            <BalanceStat label="Repos posés" value={String(balances.restDaysTaken)} sub="cette année" />
          </div>

          {employeeEvents.length > 0 ? (
            <ul className="mt-4 divide-y divide-hairline rounded-control border border-hairline">
              {employeeEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                  <span className="text-ink">{EVENT_TYPE_LABELS[event.type]}</span>
                  <span className="tabular text-faint">
                    {event.startDate === event.endDate
                      ? longDateLabel(new Date(`${event.startDate}T12:00:00`))
                      : `${event.startDate} → ${event.endDate}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-body-sm text-faint">Aucun événement enregistré.</p>
          )}
        </div>
      ) : null}

      {employee && advanced ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <h3 className="mb-3 text-label tracking-wide text-muted uppercase">Graphiques</h3>
          <EmployeeCharts employee={employee} events={events} shifts={shifts} />
        </div>
      ) : null}
    </Modal>
  )
}

function BalanceStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-control border border-hairline bg-surface-2 px-3 py-2.5">
      <p className="text-label tracking-wide text-muted uppercase">{label}</p>
      <p className="tabular text-headline-md text-ink">{value}</p>
      <p className="text-body-sm text-faint">{sub}</p>
    </div>
  )
}
