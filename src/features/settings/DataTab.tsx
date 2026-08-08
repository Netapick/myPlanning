import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { IconDownload, IconUpload } from '@/components/ui/icons'
import { validateDocumentShape } from '@/lib/validateDocument'
import { useDataStore } from '@/store/data'

/**
 * Onglet Paramètres > Données : où vit le fichier, quand il a été écrit pour
 * la dernière fois, et les trois portes de secours (export, import, remise à
 * zéro) qui ne dépendent pas du serveur local.
 */
export function DataTab() {
  const file = useDataStore((state) => state.file)
  const savedAt = useDataStore((state) => state.savedAt)
  const document = useDataStore((state) => state.document)
  const replace = useDataStore((state) => state.replace)
  const flush = useDataStore((state) => state.flush)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingImport, setPendingImport] = useState<unknown>(null)

  const exportData = () => {
    if (!document) return
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    link.href = url
    link.download = `myplanning-${stamp}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const onFileChosen = async (file: File) => {
    setImportError('')
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const error = validateDocumentShape(parsed)
      if (error) {
        setImportError(error)
        return
      }
      setPendingImport(parsed)
    } catch {
      setImportError("Ce fichier n'est pas un JSON valide.")
    }
  }

  const confirmImport = async () => {
    if (pendingImport) {
      replace(pendingImport as never)
      await flush()
    }
    setPendingImport(null)
  }

  const doReset = async () => {
    const response = await fetch('/api/reset', { method: 'POST' })
    if (response.ok) window.location.reload()
    setConfirmReset(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Fichier de données" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-label tracking-wide text-muted uppercase">Emplacement</dt>
            <dd className="mt-1 font-mono text-ink">{file}</dd>
          </div>
          <div>
            <dt className="text-label tracking-wide text-muted uppercase">Dernière sauvegarde</dt>
            <dd className="mt-1 tabular text-ink">
              {savedAt ? new Date(savedAt).toLocaleString('fr-FR') : 'Jamais'}
            </dd>
          </div>
        </dl>
        <p className="border-t border-hairline px-5 py-3 text-body-sm text-muted">
          Toutes les modifications sont écrites automatiquement dans ce fichier — il n'y a rien à
          enregistrer manuellement. Vider le cache du navigateur ne touche pas à ces données.
        </p>
      </Panel>

      <Panel>
        <PanelHeader title="Sauvegarde manuelle" />
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row">
          <Button variant="secondary" icon={<IconDownload size={16} />} onClick={exportData}>
            Exporter en JSON
          </Button>
          <Button
            variant="secondary"
            icon={<IconUpload size={16} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Importer un fichier
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void onFileChosen(file)
              event.target.value = ''
            }}
          />
        </div>
        {importError ? (
          <p className="border-t border-hairline px-5 py-3 text-body-sm text-critical-text">
            {importError}
          </p>
        ) : null}
      </Panel>

      <Panel>
        <PanelHeader title="Zone sensible" />
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-body-sm text-muted">
            Remet le planning à zéro avec le jeu de données d'exemple. Irréversible.
          </p>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Réinitialiser
          </Button>
        </div>
      </Panel>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Remplacer les données actuelles ?"
        message="Le fichier importé va remplacer entièrement le planning actuel. Exporte d'abord une sauvegarde si tu n'es pas sûr·e."
        confirmLabel="Importer"
        destructive
        onCancel={() => setPendingImport(null)}
        onConfirm={() => void confirmImport()}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Réinitialiser le planning ?"
        message="Toutes les données actuelles (personnel, tranches horaires, créneaux) seront remplacées par le jeu d'exemple. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void doReset()}
      />
    </div>
  )
}
