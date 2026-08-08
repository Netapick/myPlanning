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
