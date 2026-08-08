import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBell, IconCheck, IconClose } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/Button'
import { useUiStore } from '@/store/ui'
import type { Severity } from './rules'
import { useDismissNotification, useNotifications } from './useNotifications'

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-critical',
  serious: 'bg-serious',
  warning: 'bg-warning',
  info: 'bg-accent',
}

/**
 * La cloche de la barre du haut et son panneau.
 *
 * Elle ne signale que des faits calculés à partir du planning (fins de
 * contrat, écarts d'heures, chevauchements) — il n'y a ni serveur ni compte
 * pour en produire d'autres.
 */
export function NotificationsBell() {
  const notifications = useNotifications()
  const dismiss = useDismissNotification()
  const navigate = useNavigate()
  const open = useUiStore((state) => state.notificationsOpen)
  const setOpen = useUiStore((state) => state.setNotificationsOpen)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen])

  const count = notifications.length

  return (
    <div className="relative" ref={containerRef}>
      <IconButton
        label={count > 0 ? `Alertes (${count})` : 'Alertes'}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="relative"
      >
        <IconBell size={18} />
        {count > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-panel border border-hairline bg-surface-1 shadow-overlay">
          <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <h2 className="text-label tracking-wide text-muted uppercase">
              Alertes {count > 0 ? `(${count})` : ''}
            </h2>
            <IconButton label="Fermer" onClick={() => setOpen(false)}>
              <IconClose size={16} />
            </IconButton>
          </header>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <IconCheck size={22} className="text-good-text" />
              <p className="text-body-md text-ink">Rien à signaler</p>
              <p className="text-body-sm text-muted">
                Aucune fin de contrat proche, aucun écart d'heures ni chevauchement cette semaine.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-hairline overflow-y-auto scroll-thin">
              {notifications.map((notification) => (
                <li key={notification.key} className="group flex gap-3 px-4 py-3 hover:bg-surface-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[notification.severity]}`}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => {
                      navigate(notification.link)
                      setOpen(false)
                    }}
                  >
                    <p className="text-body-sm font-medium text-ink">{notification.title}</p>
                    <p className="mt-0.5 text-body-sm text-muted">{notification.detail}</p>
                  </button>
                  <IconButton
                    label="Masquer cette alerte"
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => dismiss(notification.key)}
                  >
                    <IconClose size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
