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

  /**
   * Petit historique de navigation local, pour griser précédent/suivant en
   * desktop Tauri (la fenêtre n'a pas de chrome de navigateur). React Router
   * n'expose pas la pile d'historique : on la reconstruit ici à partir de
   * chaque changement de route, voir `useTrackNavigation` dans AppShell.tsx.
   */
  navHistory: string[]
  navIndex: number
  canGoBack: boolean
  canGoForward: boolean
  recordNavigation: (pathname: string, type: 'PUSH' | 'POP' | 'REPLACE') => void

  /**
   * Fiche employé ouverte, indépendamment de l'écran affiché — un survol dans
   * Planning ou un lien dans Personnels doit pouvoir l'ouvrir sans jamais
   * changer d'écran actif. Une seule instance de `EmployeeForm` (montée dans
   * `AppShell.tsx`) lit ce state plutôt que chaque écran gérant sa propre
   * modale + un paramètre d'URL.
   */
  employeeProfile: { mode: 'edit'; id: string } | { mode: 'create' } | null
  openEmployeeProfile: (id: string) => void
  openEmployeeCreate: () => void
  closeEmployeeProfile: () => void
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

    navHistory: [],
    navIndex: -1,
    canGoBack: false,
    canGoForward: false,
    recordNavigation: (pathname, type) =>
      set((state) => {
        if (type === 'PUSH') {
          const history = [...state.navHistory.slice(0, state.navIndex + 1), pathname]
          return { navHistory: history, navIndex: history.length - 1, canGoBack: history.length > 1, canGoForward: false }
        }
        if (type === 'REPLACE') {
          const history = [...state.navHistory]
          const index = state.navIndex < 0 ? 0 : state.navIndex
          history[index] = pathname
          return { navHistory: history, navIndex: index, canGoBack: index > 0, canGoForward: index < history.length - 1 }
        }
        // POP : soit notre navigate(-1)/(1), soit un retour navigateur — on
        // retrouve la position dans l'historique déjà connu plutôt que d'en
        // déduire la direction, react-router ne l'expose pas.
        const backIndex = state.navIndex - 1
        const forwardIndex = state.navIndex + 1
        if (backIndex >= 0 && state.navHistory[backIndex] === pathname) {
          return { navIndex: backIndex, canGoBack: backIndex > 0, canGoForward: true }
        }
        if (forwardIndex < state.navHistory.length && state.navHistory[forwardIndex] === pathname) {
          return {
            navIndex: forwardIndex,
            canGoBack: true,
            canGoForward: forwardIndex < state.navHistory.length - 1,
          }
        }
        // Position inconnue (premier montage) : nouveau point de départ.
        return { navHistory: [pathname], navIndex: 0, canGoBack: false, canGoForward: false }
      }),

    employeeProfile: null,
    openEmployeeProfile: (id) => set({ employeeProfile: { mode: 'edit', id } }),
    openEmployeeCreate: () => set({ employeeProfile: { mode: 'create' } }),
    closeEmployeeProfile: () => set({ employeeProfile: null }),
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
