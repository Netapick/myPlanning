import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, FilterChip, StatusBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { PageHeader } from '@/components/ui/PageHeader'
import { CalendarOff, IconEdit, IconPlus, IconTrash, IconUsers } from '@/components/ui/icons'
import { derivedStatus } from '@/lib/events'
import { formatHours } from '@/lib/time'
import type { Employee, Event } from '@/lib/types'
import { fullName } from '@/lib/types'
import { toIso } from '@/lib/week'
import { useDataStore } from '@/store/data'
import { useUiStore } from '@/store/ui'
import { EmployeeForm } from './EmployeeForm'
import { EventForm } from './EventForm'

type FilterKey = 'all' | 'actif' | 'conges' | 'maladie'

const PAGE_SIZE = 8

/**
 * Écran Personnel : tableau filtrable, recherche câblée sur la barre du haut,
 * panneau d'ajout/édition, suppression confirmée.
 */
export function PersonnelScreen() {
  const employees = useDataStore((state) => state.document?.employees ?? [])
  const teams = useDataStore((state) => state.document?.teams ?? [])
  const shifts = useDataStore((state) => state.document?.shifts ?? [])
  const events = useDataStore((state) => state.document?.events ?? [])
  const today = useMemo(() => toIso(new Date()), [])
  const upsertEmployee = useDataStore((state) => state.upsertEmployee)
  const removeEmployee = useDataStore((state) => state.removeEmployee)
  const upsertEvent = useDataStore((state) => state.upsertEvent)
  const search = useUiStore((state) => state.search)
  const [searchParams, setSearchParams] = useSearchParams()

  const [filter, setFilter] = useState<FilterKey>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [toDelete, setToDelete] = useState<Employee | null>(null)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [eventDefaultEmployeeId, setEventDefaultEmployeeId] = useState<string | undefined>()

  // Ouvre directement la fiche visée quand on arrive depuis un lien externe
  // (ex. clic sur un nom dans le planning) : /personnel?employee=<id>.
  useEffect(() => {
    const targetId = searchParams.get('employee')
    if (!targetId) return
    const target = employees.find((employee) => employee.id === targetId)
    if (target) {
      setEditing(target)
      setFormOpen(true)
    }
    setSearchParams((params) => {
      params.delete('employee')
      return params
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])

  // Heures planifiées, toutes semaines confondues, pour le mini-total de
  // colonne — un repère rapide, pas un calcul de paie.
  const totalMinutesByEmployee = useMemo(() => {
    const totals = new Map<string, number>()
    for (const shift of shifts) {
      const [sh = 0, sm = 0] = shift.start.split(':').map(Number)
      const [eh = 0, em = 0] = shift.end.split(':').map(Number)
      const span = (eh * 60 + em - (sh * 60 + sm) + 1440) % 1440 || 1440
      totals.set(shift.employeeId, (totals.get(shift.employeeId) ?? 0) + span - shift.breakMinutes)
    }
    return totals
  }, [shifts])

  const counts = useMemo(() => {
    const active = employees.filter((employee) => !employee.archived)
    return {
      all: active.length,
      actif: active.filter((employee) => employee.status === 'actif').length,
      conges: active.filter((employee) => employee.status === 'conges').length,
      maladie: active.filter((employee) => employee.status === 'maladie').length,
    }
  }, [employees])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees
      .filter((employee) => !employee.archived)
      .filter((employee) => filter === 'all' || employee.status === filter)
      .filter((employee) => {
        if (!query) return true
        const haystack =
          `${fullName(employee)} ${employee.role} ${employee.department}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'))
  }, [employees, filter, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (employee: Employee) => {
    setEditing(employee)
    setFormOpen(true)
  }
  const openEventCreate = (employeeId?: string) => {
    setEventDefaultEmployeeId(employeeId)
    setEventFormOpen(true)
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `Tous (${counts.all})` },
    { key: 'actif', label: `Actifs (${counts.actif})` },
    { key: 'conges', label: `En congés (${counts.conges})` },
    { key: 'maladie', label: `En arrêt (${counts.maladie})` },
  ]

  return (
    <div>
      <PageHeader
        title="Personnels"
        subtitle="Fiches, contrats et statuts de l'équipe."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<CalendarOff size={18} />}
              onClick={() => openEventCreate()}
            >
              Événement
            </Button>
            <Button icon={<IconPlus size={18} />} onClick={openCreate}>
              Ajouter un membre
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <FilterChip
            key={key}
            active={filter === key}
            onClick={() => {
              setFilter(key)
              setPage(1)
            }}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      <Panel>
        <PanelHeader title={`${filtered.length} personne${filtered.length > 1 ? 's' : ''}`} tinted />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconUsers size={28} />}
            title="Aucune personne trouvée"
            description="Ajuste la recherche ou le filtre, ou ajoute un nouveau membre."
            action={<Button onClick={openCreate}>Ajouter un membre</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-hairline text-label tracking-wide text-muted uppercase">
                    <th className="px-5 py-3 font-semibold">Employé</th>
                    <th className="px-5 py-3 font-semibold">Poste</th>
                    <th className="px-5 py-3 font-semibold">Contrat</th>
                    <th className="px-5 py-3 font-semibold">Heures planifiées</th>
                    <th className="px-5 py-3 font-semibold">Statut</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((employee) => (
                    <tr key={employee.id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar employee={employee} size={36} />
                          <div>
                            <p className="font-medium text-ink">{fullName(employee)}</p>
                            <p className="text-faint">
                              {employee.teamId ? (teamById.get(employee.teamId)?.name ?? '—') : 'Sans équipe'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <p className="text-ink">{employee.role || '—'}</p>
                        <p className="text-faint">{employee.department || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <p className="text-ink">{employee.contract.type}</p>
                        <p className="tabular text-faint">{employee.contract.weeklyHours} h / sem</p>
                      </td>
                      <td className="px-5 py-3 tabular text-muted">
                        {formatHours(totalMinutesByEmployee.get(employee.id) ?? 0)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={derivedStatus(employee, events, today)} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton
                            label="Ajouter un événement"
                            onClick={() => openEventCreate(employee.id)}
                          >
                            <CalendarOff size={16} />
                          </IconButton>
                          <IconButton label="Modifier" onClick={() => openEdit(employee)}>
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton
                            label="Supprimer"
                            tone="danger"
                            onClick={() => setToDelete(employee)}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-hairline px-5 py-3 text-body-sm text-muted">
                <span>
                  Page {currentPage} sur {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Panel>

      <EmployeeForm
        open={formOpen}
        employee={editing}
        teams={teams}
        events={events}
        shifts={shifts}
        onClose={() => setFormOpen(false)}
        onSave={upsertEmployee}
      />

      <EventForm
        open={eventFormOpen}
        event={null}
        employees={employees.filter((employee) => !employee.archived)}
        defaultEmployeeId={eventDefaultEmployeeId}
        onClose={() => setEventFormOpen(false)}
        onSave={(event: Event) => upsertEvent(event)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette personne ?"
        message={
          toDelete
            ? `${fullName(toDelete)} sera retiré·e du personnel et tous ses créneaux planifiés seront supprimés. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeEmployee(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}
