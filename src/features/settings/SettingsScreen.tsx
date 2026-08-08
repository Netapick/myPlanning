import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { AppearanceTab } from './AppearanceTab'
import { DataTab } from './DataTab'
import { NotificationsTab } from './NotificationsTab'
import { ShiftTemplatesTab } from './ShiftTemplatesTab'
import { TeamsTab } from './TeamsTab'

type TabKey = 'shifts' | 'teams' | 'notifications' | 'data' | 'appearance'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'shifts', label: 'Tranches horaires' },
  { key: 'teams', label: 'Équipes' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'data', label: 'Données' },
  { key: 'appearance', label: 'Apparence' },
]

/** Écran Paramètres : cinq onglets, un composant dédié chacun. */
export function SettingsScreen() {
  const [tab, setTab] = useState<TabKey>('shifts')

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Tranches horaires, équipes, alertes et données." />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-hairline">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-body-md font-medium whitespace-nowrap transition-colors ${
              tab === key
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'shifts' ? <ShiftTemplatesTab /> : null}
      {tab === 'teams' ? <TeamsTab /> : null}
      {tab === 'notifications' ? <NotificationsTab /> : null}
      {tab === 'data' ? <DataTab /> : null}
      {tab === 'appearance' ? <AppearanceTab /> : null}
    </div>
  )
}
