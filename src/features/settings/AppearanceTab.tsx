import { Panel, PanelHeader } from '@/components/ui/Panel'
import { IconMonitor, IconMoon, IconSun } from '@/components/ui/icons'
import { useUiStore, type ThemeMode } from '@/store/ui'

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof IconSun }[] = [
  { mode: 'light', label: 'Clair', Icon: IconSun },
  { mode: 'dark', label: 'Sombre', Icon: IconMoon },
  { mode: 'system', label: 'Système', Icon: IconMonitor },
]

/** Onglet Paramètres > Apparence : le seul réglage gardé dans le navigateur. */
export function AppearanceTab() {
  const themeMode = useUiStore((state) => state.themeMode)
  const setThemeMode = useUiStore((state) => state.setThemeMode)

  return (
    <Panel>
      <PanelHeader title="Thème" />
      <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row">
        {OPTIONS.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={themeMode === mode}
            onClick={() => setThemeMode(mode)}
            className={`flex flex-1 flex-col items-center gap-2 rounded-panel border px-4 py-5 transition-colors ${
              themeMode === mode
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-hairline text-muted hover:bg-surface-2'
            }`}
          >
            <Icon size={22} />
            <span className="text-body-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
      <p className="border-t border-hairline px-5 py-3 text-body-sm text-muted">
        Ce réglage est propre à cet appareil et ce navigateur — il ne fait pas partie du fichier
        de planning partagé.
      </p>
    </Panel>
  )
}
