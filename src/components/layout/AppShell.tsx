import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { IconAlert } from '@/components/ui/icons'
import { useDataStore } from '@/store/data'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'

/**
 * Coquille de l'application : barre latérale + barre du haut + plan de
 * travail. Elle porte aussi le chargement du document — aucun écran ne
 * s'affiche avant que `data/planning.json` ne soit lu, ce qui évite à chacun
 * d'eux d'avoir à gérer l'état « pas encore de données ».
 */
export function AppShell() {
  const status = useDataStore((state) => state.status)
  const loadError = useDataStore((state) => state.loadError)
  const load = useDataStore((state) => state.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-4 sm:p-canvas">
          {status === 'loading' ? (
            <p className="py-16 text-center text-body-md text-muted">Chargement du planning…</p>
          ) : status === 'error' ? (
            <LoadError message={loadError} onRetry={() => void load()} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}

function LoadError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-panel border border-hairline bg-surface-1 px-6 py-12 text-center">
      <IconAlert size={28} className="text-critical-text" />
      <h2 className="text-headline-md text-ink">Planning illisible</h2>
      <p className="text-body-md text-muted">{message}</p>
      <p className="text-body-sm text-faint">
        Le fichier de données est lu par un petit serveur local. Vérifie que l'application a bien
        été lancée avec <code className="text-ink">npm run dev</code> ou{' '}
        <code className="text-ink">npm start</code> — l'ouvrir directement depuis le disque ne
        suffit pas, le navigateur n'aurait alors pas le droit d'écrire.
      </p>
      <Button onClick={onRetry}>Réessayer</Button>
    </div>
  )
}
