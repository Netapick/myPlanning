import { IconButton } from '@/components/ui/Button'
import { IconMenu, IconMoon, IconSearch, IconSun } from '@/components/ui/icons'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
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

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-hairline bg-surface-1 px-4 sm:px-canvas">
      <div className="flex flex-1 items-center gap-3">
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
