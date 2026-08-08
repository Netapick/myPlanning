import { useMemo } from 'react'
import { useDataStore } from '@/store/data'
import { computeNotifications, type Notification } from './rules'

/**
 * Les alertes de la semaine en cours.
 *
 * La référence est toujours *aujourd'hui*, jamais la semaine consultée dans le
 * planning : la cloche doit dire l'état réel du service, pas celui de la
 * semaine qu'on est en train de feuilleter.
 */
export const useNotifications = (): Notification[] => {
  const document = useDataStore((state) => state.document)

  return useMemo(() => {
    if (!document) return []
    return computeNotifications(document, new Date())
  }, [document])
}

/** Masque une alerte : sa clé rejoint la liste des ignorées, dans le fichier. */
export const useDismissNotification = () => {
  const mutate = useDataStore((state) => state.mutate)
  return (key: string) =>
    mutate((doc) => ({
      ...doc,
      settings: {
        ...doc.settings,
        notifications: {
          ...doc.settings.notifications,
          dismissed: [...doc.settings.notifications.dismissed, key],
        },
      },
    }))
}

/**
 * Masque toutes les alertes actuellement affichées d'un coup — le bouton
 * « Tout effacer » du panneau. Prend les clés en argument plutôt que de les
 * recalculer : c'est la liste déjà affichée à l'écran qui doit disparaître,
 * pas un recalcul qui pourrait diverger d'un rendu à l'autre.
 */
export const useDismissAllNotifications = () => {
  const mutate = useDataStore((state) => state.mutate)
  return (keys: string[]) =>
    mutate((doc) => ({
      ...doc,
      settings: {
        ...doc.settings,
        notifications: {
          ...doc.settings.notifications,
          dismissed: [...new Set([...doc.settings.notifications.dismissed, ...keys])],
        },
      },
    }))
}
