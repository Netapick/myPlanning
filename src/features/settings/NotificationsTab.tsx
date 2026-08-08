import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { RULE_DESCRIPTIONS, RULE_LABELS, type RuleId } from '@/features/notifications/rules'
import { useResetDismissed } from '@/features/notifications/useNotifications'
import { useDataStore } from '@/store/data'

const RULES: RuleId[] = [
  'contract-ending',
  'overtime',
  'undertime',
  'overlap',
  'absent-scheduled',
  'uncovered-day',
]

/** Onglet Paramètres > Notifications : active/désactive chaque règle et ses seuils. */
export function NotificationsTab() {
  const settings = useDataStore((state) => state.document?.settings)
  const updateSettings = useDataStore((state) => state.updateSettings)
  const resetDismissed = useResetDismissed()

  if (!settings) return null
  const { notifications } = settings

  const toggleRule = (rule: RuleId) =>
    updateSettings({
      notifications: {
        ...notifications,
        enabledRules: { ...notifications.enabledRules, [rule]: !(notifications.enabledRules[rule] !== false) },
      },
    })

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Règles d'alerte" />
        <ul className="divide-y divide-hairline">
          {RULES.map((rule) => {
            const active = notifications.enabledRules[rule] !== false
            return (
              <li key={rule} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{RULE_LABELS[rule]}</p>
                  <p className="text-body-sm text-muted">{RULE_DESCRIPTIONS[rule]}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => toggleRule(rule)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    active ? 'bg-accent' : 'bg-surface-3'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-raised transition-transform ${
                      active ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Seuils" />
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-label tracking-wide text-muted uppercase">
              Préavis de fin de contrat
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={180}
                value={notifications.contractNoticeDays}
                onChange={(event) =>
                  updateSettings({
                    notifications: {
                      ...notifications,
                      contractNoticeDays: Math.max(1, Number(event.target.value) || 1),
                    },
                  })
                }
                className="h-10 w-24 rounded-control border border-hairline bg-surface-1 px-3 text-body-md text-ink field-focus"
              />
              <span className="text-body-sm text-muted">jours avant l'échéance</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-label tracking-wide text-muted uppercase">
              Tolérance d'heures
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={notifications.hoursTolerance}
                onChange={(event) =>
                  updateSettings({
                    notifications: {
                      ...notifications,
                      hoursTolerance: Math.max(0, Number(event.target.value) || 0),
                    },
                  })
                }
                className="h-10 w-24 rounded-control border border-hairline bg-surface-1 px-3 text-body-md text-ink field-focus"
              />
              <span className="text-body-sm text-muted">
                heures avant de signaler un dépassement ou une sous-charge
              </span>
            </div>
          </label>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Alertes masquées"
          action={
            <Button
              variant="secondary"
              size="sm"
              disabled={notifications.dismissed.length === 0}
              onClick={resetDismissed}
            >
              Tout réafficher
            </Button>
          }
        />
        <p className="px-5 py-4 text-body-sm text-muted">
          {notifications.dismissed.length === 0
            ? 'Aucune alerte masquée pour le moment.'
            : `${notifications.dismissed.length} alerte${notifications.dismissed.length > 1 ? 's' : ''} masquée${notifications.dismissed.length > 1 ? 's' : ''} manuellement.`}
        </p>
      </Panel>
    </div>
  )
}
