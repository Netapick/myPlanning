import { useEffect, useRef, type ReactNode } from 'react'
import { Button, IconButton } from './Button'
import { IconClose } from './icons'

/**
 * Couche de superposition — « Level 3 » du design system : filet net de 1px et
 * ombre moyenne, sans flou d'arrière-plan (celui-ci nuirait à la lisibilité
 * des chaînes denses derrière).
 */

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** `wide` pour les formulaires à deux colonnes. */
  size?: 'md' | 'wide'
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Le fond ne doit pas défiler derrière la boîte de dialogue.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Le premier champ prend le focus : sur un formulaire de saisie rapide,
    // devoir cliquer avant de taper est une friction inutile.
    panelRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full rounded-panel border border-hairline bg-surface-1 shadow-overlay ${
          size === 'wide' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          <h2 className="text-headline-md text-ink">{title}</h2>
          <IconButton label="Fermer" onClick={onClose}>
            <IconClose size={18} />
          </IconButton>
        </header>
        <div className="px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-hairline px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body-md text-muted">{message}</p>
    </Modal>
  )
}
