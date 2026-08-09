import { useNavigate } from 'react-router-dom'
import { IconButton } from '@/components/ui/Button'
import {
  IconChevronLeft,
  IconChevronRight,
  IconMenu,
  IconMoon,
  IconRefresh,
  IconSearch,
  IconSun,
} from '@/components/ui/icons'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { isTauri } from '@/lib/api'
import { useDataStore } from '@/store/data'
import { useUiStore } from '@/store/ui'
import { SaveIndicator } from './SaveIndicator'

/**
 * Barre du haut : recherche à gauche, actions à droite.
 *
 * La recherche est globale et vit dans le store d'interface ; c'est l'écran
 * affiché qui décide de ce qu'elle filtre (le personnel pour l'instant).
 */
export function TopBar() {
  const search = useUiStore((state) => state.search)
  const setSearch = useUiStore((state) => state.setSearch)
  const resolvedTheme = useUiStore((state) => state.resolvedTheme)
  const setThemeMode = useUiStore((state) => state.setThemeMode)
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)
  const canGoBack = useUiStore((state) => state.canGoBack)
  const canGoForward = useUiStore((state) => state.canGoForward)
  const navigate = useNavigate()
  const load = useDataStore((state) => state.load)

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-hairline bg-surface-1 px-4 sm:px-canvas">
      <div className="flex flex-1 items-center gap-3">
        {isTauri() ? (
          // La fenêtre desktop utilise le chrome natif de l'OS, sans bouton
          // précédent/suivant de navigateur — on le recrée ici, absent en mode
          // web où le navigateur a déjà les siens.
          <div className="flex items-center gap-1">
            <IconButton
              label="Page précédente"
              disabled={!canGoBack}
              className={canGoBack ? '' : 'pointer-events-none opacity-40'}
              onClick={() => navigate(-1)}
            >
              <IconChevronLeft size={18} />
            </IconButton>
            <IconButton
              label="Page suivante"
              disabled={!canGoForward}
              className={canGoForward ? '' : 'pointer-events-none opacity-40'}
              onClick={() => navigate(1)}
            >
              <IconChevronRight size={18} />
            </IconButton>
            <IconButton label="Rafraîchir" onClick={() => void load()}>
              <IconRefresh size={18} />
            </IconButton>
          </div>
        ) : null}

        <IconButton
          label="Ouvrir le menu"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <IconMenu size={20} />
        </IconButton>

        <div className="relative w-full max-w-md">
          <IconSearch
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une personne, un poste…"
            aria-label="Rechercher"
            className="h-10 w-full rounded-control border border-hairline bg-surface-2 pr-3 pl-10 text-body-md text-ink placeholder:text-faint field-focus transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <SaveIndicator />
        <NotificationsBell />
        <IconButton
          label={resolvedTheme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          onClick={() => setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </IconButton>
      </div>
    </header>
  )
}
