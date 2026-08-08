import { create } from 'zustand'

/**
 * État purement visuel — rien ici n'a sa place dans `planning.json`.
 *
 * Le thème est la seule chose que l'application garde dans le navigateur :
 * c'est une préférence d'appareil (l'écran du bureau et celui du portable
 * n'appellent pas le même réglage), pas une donnée de planning. Il doit aussi
 * être lisible de façon synchrone avant le premier rendu, ce qu'un fichier
 * chargé par le réseau ne permet pas.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** Doit rester identique à la clé lue par le script inline d'index.html. */
const THEME_KEY = 'myplanning.theme'

const systemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const readStoredMode = (): ThemeMode => {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
  } catch {
    return 'system'
  }
}

const applyTheme = (resolved: ResolvedTheme) => {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

interface UiState {
  themeMode: ThemeMode
  resolvedTheme: ResolvedTheme
  setThemeMode: (mode: ThemeMode) => void

  /** Recherche globale de la barre du haut, consommée par l'écran affiché. */
  search: string
  setSearch: (value: string) => void

  notificationsOpen: boolean
  setNotificationsOpen: (open: boolean) => void

  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set) => {
  const themeMode = readStoredMode()
  return {
    themeMode,
    resolvedTheme: themeMode === 'system' ? systemTheme() : themeMode,

    setThemeMode: (mode) => {
      try {
        localStorage.setItem(THEME_KEY, mode)
      } catch {
        // Navigation privée ou stockage désactivé : le thème ne survivra pas au
        // rechargement, ce qui n'empêche pas de l'utiliser dans cette session.
      }
      const resolved = mode === 'system' ? systemTheme() : mode
      applyTheme(resolved)
      set({ themeMode: mode, resolvedTheme: resolved })
    },

    search: '',
    setSearch: (value) => set({ search: value }),

    notificationsOpen: false,
    setNotificationsOpen: (open) => set({ notificationsOpen: open }),

    mobileNavOpen: false,
    setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  }
})

/**
 * Applique le thème au démarrage et suit le réglage système tant que le mode
 * « système » est actif. Le script inline d'index.html a déjà posé la bonne
 * valeur pour éviter le flash ; on refait le travail ici pour couvrir les
 * changements en cours de session.
 */
export const initTheme = () => {
  const { themeMode, setThemeMode } = useUiStore.getState()
  setThemeMode(themeMode)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useUiStore.getState().themeMode === 'system') setThemeMode('system')
  })
}
