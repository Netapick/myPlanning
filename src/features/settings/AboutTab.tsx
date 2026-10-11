import { useState } from 'react'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import { Button } from '@/components/ui/Button'
import { IconRefresh } from '@/components/ui/icons'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { isTauri } from '@/lib/api'
import { checkForUpdateDetailed, type UpdateCheck } from '@/lib/appUpdate'

/** Onglet « À propos » : version installée et vérification manuelle des mises à jour. */
export function AboutTab() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheck | null>(null)

  const check = async () => {
    setChecking(true)
    setResult(null)
    setResult(await checkForUpdateDetailed(__APP_VERSION__))
    setChecking(false)
  }

  return (
    <Panel>
      <PanelHeader title="Mises à jour" />
      <div className="flex flex-col gap-3 px-5 py-4 text-body-sm">
        <p className="text-ink">
          Version installée : <span className="tabular font-medium">v{__APP_VERSION__}</span>
        </p>

        {isTauri() ? (
          <>
            <div>
              <Button
                variant="secondary"
                icon={<IconRefresh size={16} />}
                disabled={checking}
                onClick={() => void check()}
              >
                {checking ? 'Vérification…' : 'Vérifier les mises à jour'}
              </Button>
            </div>

            {result?.status === 'upToDate' ? (
              <p role="status" className="text-good-text">
                Vous utilisez la dernière version.
              </p>
            ) : null}
            {result?.status === 'offline' ? (
              <p role="status" className="text-critical-text">
                Pas de connexion internet : impossible de vérifier les mises à jour. Vérifiez la
                connexion.
              </p>
            ) : null}
            {result?.status === 'error' ? (
              <p role="status" className="text-critical-text">
                Vérification impossible pour le moment. Réessayez plus tard.
              </p>
            ) : null}
            {result?.status === 'available' ? (
              <div className="overflow-hidden rounded-control border border-accent/30">
                <UpdateBanner update={result.update} onDismiss={() => setResult(null)} />
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-muted">
            Les mises à jour ne concernent que l'application installée sur le poste.
          </p>
        )}
      </div>
    </Panel>
  )
}
