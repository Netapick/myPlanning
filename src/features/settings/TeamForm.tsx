import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { colorVar, PALETTE_LABELS, PALETTE_SIZE } from '@/lib/palette'
import { titleCase } from '@/lib/text'
import type { Team } from '@/lib/types'
import { newId } from '@/store/data'

interface TeamFormProps {
  open: boolean
  team: Team | null
  defaultColor: number
  onSave: (team: Team) => void
  onClose: () => void
}

export function TeamForm({ open, team, defaultColor, onSave, onClose }: TeamFormProps) {
  const [name, setName] = useState('')
  const [colorIndex, setColorIndex] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setColorIndex(team?.colorIndex ?? defaultColor)
    setError('')
  }, [open, team, defaultColor])

  const submit = () => {
    if (!name.trim()) {
      setError('Nom obligatoire.')
      return
    }
    onSave({ id: team?.id ?? newId(), name: titleCase(name.trim()), colorIndex })
    onClose()
  }

  return (
    <Modal
      open={open}
      title={team ? "Modifier l'équipe" : 'Nouvelle équipe'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{team ? 'Enregistrer' : 'Créer'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nom"
          placeholder="ex. Équipe A"
          value={name}
          error={error}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setName(titleCase(name))}
        />
        <div>
          <p className="mb-1.5 text-label tracking-wide text-muted uppercase">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: PALETTE_SIZE }, (_, i) => i + 1).map((index) => (
              <button
                key={index}
                type="button"
                aria-label={PALETTE_LABELS[index - 1]}
                aria-pressed={colorIndex === index}
                onClick={() => setColorIndex(index)}
                className={`h-8 w-8 rounded-full transition-shadow ${
                  colorIndex === index ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface-1' : ''
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
