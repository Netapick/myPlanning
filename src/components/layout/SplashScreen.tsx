import { IconCalendar } from '@/components/ui/icons'

/**
 * Écran de démarrage, affiché une seule fois par vraie ouverture (voir la
 * logique `sessionStorage` dans `AppShell.tsx`) — jamais rejoué au F5.
 * Overlay plein écran, animation courte en CSS pure, aucune dépendance
 * d'animation supplémentaire.
 */
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface-0">
      <span className="flex h-16 w-16 animate-[splash-in_500ms_ease-out] items-center justify-center rounded-panel bg-accent text-accent-contrast shadow-overlay">
        <IconCalendar size={32} />
      </span>
      <p className="animate-[splash-in_500ms_ease-out] text-headline-md font-bold text-accent">myPlanning</p>
    </div>
  )
}
