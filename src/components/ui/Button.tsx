import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Boutons du design system : plein `#0052CC`, secondaire blanc bordé, et
 * fantôme pour les actions d'annulation. Aucun dégradé nulle part.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:bg-accent-strong',
  secondary: 'bg-surface-1 text-muted border border-hairline hover:bg-surface-2',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-critical-soft text-critical-text hover:bg-critical/20',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-10 px-4 text-body-md',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger'
}

/** Bouton carré sans libellé — le `label` devient le titre accessible. */
export function IconButton({
  label,
  tone = 'default',
  className = '',
  type = 'button',
  children,
  ...rest
}: IconButtonProps) {
  const toneClass =
    tone === 'danger'
      ? 'text-faint hover:text-critical-text hover:bg-critical-soft'
      : 'text-faint hover:text-accent hover:bg-surface-3'
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-control transition-colors ${toneClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
