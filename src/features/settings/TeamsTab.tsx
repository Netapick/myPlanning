import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { IconEdit, IconPlus, IconTrash, IconUsers } from '@/components/ui/icons'
import { colorVar, nextColorIndex } from '@/lib/palette'
import type { Team } from '@/lib/types'
import { EMPTY_EMPLOYEES, EMPTY_TEAMS, useDataStore } from '@/store/data'
import { TeamForm } from './TeamForm'

/** Onglet Paramètres > Équipes : le regroupement utilisé par le filtre du planning. */
export function TeamsTab() {
  const teams = useDataStore((state) => state.document?.teams ?? EMPTY_TEAMS)
  const employees = useDataStore((state) => state.document?.employees ?? EMPTY_EMPLOYEES)
  const upsertTeam = useDataStore((state) => state.upsertTeam)
  const removeTeam = useDataStore((state) => state.removeTeam)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [toDelete, setToDelete] = useState<Team | null>(null)

  const memberCount = (teamId: string) =>
    employees.filter((employee) => employee.teamId === teamId && !employee.archived).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (team: Team) => {
    setEditing(team)
    setFormOpen(true)
  }

  return (
    <Panel>
      <PanelHeader
        title="Équipes"
        action={
          <Button size="sm" icon={<IconPlus size={16} />} onClick={openCreate}>
            Nouvelle équipe
          </Button>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={28} />}
          title="Aucune équipe"
          description="Les équipes alimentent le filtre du planning hebdomadaire."
          action={<Button onClick={openCreate}>Nouvelle équipe</Button>}
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center gap-4 px-5 py-3.5">
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: colorVar(team.colorIndex) }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{team.name}</p>
                <p className="text-body-sm text-muted">
                  {memberCount(team.id)} membre{memberCount(team.id) > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <IconButton label="Modifier" onClick={() => openEdit(team)}>
                  <IconEdit size={16} />
                </IconButton>
                <IconButton label="Supprimer" tone="danger" onClick={() => setToDelete(team)}>
                  <IconTrash size={16} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TeamForm
        open={formOpen}
        team={editing}
        defaultColor={nextColorIndex(teams.map((team) => team.colorIndex))}
        onClose={() => setFormOpen(false)}
        onSave={upsertTeam}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette équipe ?"
        message={
          toDelete
            ? `« ${toDelete.name} » sera supprimée. Les membres qui en faisaient partie repasseront « Sans équipe ».`
            : ''
        }
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeTeam(toDelete.id)
          setToDelete(null)
        }}
      />
    </Panel>
  )
}
