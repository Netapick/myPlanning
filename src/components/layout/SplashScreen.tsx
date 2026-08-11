import { IconLayers } from '@/components/ui/icons'

/**
 * Durée plancher du splash (voir `AppShell.tsx`) — évite un flash disgracieux
 * si le disque répond instantanément. La barre de progression ci-dessous est
 * animée sur cette même durée : source de vérité unique entre le visuel et la
 * logique de fermeture, pas deux constantes à resynchroniser à la main.
 */
export const SPLASH_MIN_MS = 700
/** Plafond dur : le splash ne doit jamais rester affiché plus de ~5 s, même
 *  si le chargement du document traîne anormalement (disque lent, erreur). */
export const SPLASH_MAX_MS = 4500

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
        <IconLayers size={32} />
      </span>
      <p className="animate-[splash-in_500ms_ease-out] text-headline-md font-bold text-accent">myPlanning</p>
      <span className="h-1 w-40 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-full origin-left rounded-full bg-accent [animation-fill-mode:forwards] [animation-timing-function:ease-out]"
          style={{ animationName: 'splash-progress', animationDuration: `${SPLASH_MIN_MS}ms` }}
        />
      </span>
    </div>
  )
}
