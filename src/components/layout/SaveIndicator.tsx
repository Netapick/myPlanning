import { IconAlert, IconCheck, IconClock } from '@/components/ui/icons'
import { useDataStore } from '@/store/data'

/**
 * L'état de la sauvegarde vers `data/planning.json`.
 *
 * Un outil qui écrit tout seul en tâche de fond doit dire quand il l'a fait,
 * et surtout quand il a échoué : le message d'erreur du serveur (disque plein,
 * droits, JSON refusé) remonte ici tel quel, parce que c'est la seule chose
 * qui permet d'agir.
 */
export function SaveIndicator() {
  const status = useDataStore((state) => state.saveStatus)
  const error = useDataStore((state) => state.saveError)
  const file = useDataStore((state) => state.file)

  if (status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-control bg-critical-soft px-2 py-1 text-body-sm text-critical-text"
        title={error ?? undefined}
      >
        <IconAlert size={14} />
        <span className="hidden sm:inline">Sauvegarde impossible</span>
      </span>
    )
  }

  if (status === 'pending' || status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-body-sm text-faint">
        <IconClock size={14} />
        <span className="hidden sm:inline">Enregistrement…</span>
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 text-body-sm text-faint"
      title={`Données enregistrées dans ${file}`}
    >
      <IconCheck size={14} />
      <span className="hidden sm:inline">Enregistré</span>
    </span>
  )
}
