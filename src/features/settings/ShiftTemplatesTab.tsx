import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/Panel'
import { IconCalendar, IconEdit, IconPlus, IconTrash } from '@/components/ui/icons'
import { colorVar, nextColorIndex } from '@/lib/palette'
import { formatDuration, formatRange, spanMinutes } from '@/lib/time'
import type { ShiftTemplate } from '@/lib/types'
import { EMPTY_SHIFT_TEMPLATES, useDataStore } from '@/store/data'
import { ShiftTemplateForm } from './ShiftTemplateForm'

/** Onglet Paramètres > Tranches horaires : les modèles réutilisables de poste. */
export function ShiftTemplatesTab() {
  const templates = useDataStore((state) => state.document?.shiftTemplates ?? EMPTY_SHIFT_TEMPLATES)
  const upsertTemplate = useDataStore((state) => state.upsertTemplate)
  const removeTemplate = useDataStore((state) => state.removeTemplate)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftTemplate | null>(null)
  const [toDelete, setToDelete] = useState<ShiftTemplate | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (template: ShiftTemplate) => {
    setEditing(template)
    setFormOpen(true)
  }

  return (
    <Panel>
      <PanelHeader
        title="Tranches horaires"
        action={
          <Button size="sm" icon={<IconPlus size={16} />} onClick={openCreate}>
            Nouvelle tranche
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={28} />}
          title="Aucune tranche horaire"
          description="Crée des modèles de poste (Matin, Soir, Nuit…) pour les poser rapidement dans le planning."
          action={<Button onClick={openCreate}>Nouvelle tranche</Button>}
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center gap-4 px-5 py-3.5">
              <span
                className="h-9 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorVar(template.colorIndex) }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{template.name}</p>
                <p className="tabular text-body-sm text-muted">
                  {formatRange(template.start, template.end)} ·{' '}
                  {formatDuration(spanMinutes(template.start, template.end))} travaillées
                </p>
              </div>
              <div className="flex gap-1">
                <IconButton label="Modifier" onClick={() => openEdit(template)}>
                  <IconEdit size={16} />
                </IconButton>
                <IconButton label="Supprimer" tone="danger" onClick={() => setToDelete(template)}>
                  <IconTrash size={16} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ShiftTemplateForm
        open={formOpen}
        template={editing}
        defaultColor={nextColorIndex(templates.map((template) => template.colorIndex))}
        onClose={() => setFormOpen(false)}
        onSave={upsertTemplate}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette tranche horaire ?"
        message={
          toDelete
            ? `« ${toDelete.name} » sera supprimée. Les créneaux déjà posés dans le planning garderont leurs horaires et leur couleur — seul le lien vers ce modèle disparaît.`
            : ''
        }
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeTemplate(toDelete.id)
          setToDelete(null)
        }}
      />
    </Panel>
  )
}
