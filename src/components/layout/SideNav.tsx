import { NavLink } from 'react-router-dom'
import {
  IconCalendar,
  IconClock,
  IconClose,
  IconDashboard,
  IconSettings,
  IconUsers,
} from '@/components/ui/icons'
import { IconButton } from '@/components/ui/Button'
import { useUiStore } from '@/store/ui'

/**
 * Barre latérale persistante — la structure imposée par le design system.
 *
 * Pas de « Déconnexion » ni d'avatar : l'application est locale et
 * mono-utilisateur, le serveur n'écoute que sur 127.0.0.1. Un compte
 * n'ajouterait que de la friction sans rien protéger de plus.
 */

const LINKS = [
  { to: '/', label: 'Tableau de bord', Icon: IconDashboard, end: true },
  { to: '/planning', label: 'Planning', Icon: IconCalendar, end: false },
  { to: '/personnel', label: 'Personnels', Icon: IconUsers, end: false },
  { to: '/rh', label: 'Ressources humaines', Icon: IconClock, end: false },
  { to: '/parametres', label: 'Paramètres', Icon: IconSettings, end: false },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="mb-8 flex items-center gap-3 px-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-control bg-accent text-accent-contrast">
          <IconCalendar size={22} />
        </span>
        <div>
          <h1 className="text-headline-md font-bold text-accent">myPlanning</h1>
          <p className="text-body-sm text-muted">WELDOM - Cosne sur Loire</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-control px-3 py-2.5 text-body-md transition-colors ${
                isActive
                  ? 'border-r-2 border-accent bg-accent-soft font-semibold text-accent'
                  : 'text-muted hover:bg-surface-3'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-6 pt-4 text-body-sm text-faint">
        <p>Données locales · v{__APP_VERSION__}</p>
        <p>© {new Date().getFullYear()} Julien Gataleta — Tous droits réservés</p>
      </div>
    </>
  )
}

export function SideNav() {
  const mobileOpen = useUiStore((state) => state.mobileNavOpen)
  const setMobileOpen = useUiStore((state) => state.setMobileNavOpen)

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-sidebar shrink-0 flex-col border-r border-hairline bg-surface-1 py-canvas lg:flex">
        <NavContent />
      </aside>

      {/* En dessous de `lg`, la barre devient un tiroir : la grille du planning
          a besoin de toute la largeur disponible. */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileOpen(false)
          }}
        >
          <div className="flex h-full w-sidebar flex-col border-r border-hairline bg-surface-1 py-canvas">
            <div className="mb-2 flex justify-end px-4">
              <IconButton label="Fermer le menu" onClick={() => setMobileOpen(false)}>
                <IconClose size={18} />
              </IconButton>
            </div>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}
