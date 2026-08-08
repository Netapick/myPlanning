import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import { IconChevronDown } from './icons'

/**
 * Champs de formulaire. Bordure `#DFE1E6` au repos, bordure accent + halo de
 * 2px à 20% au focus — c'est l'état de focus imposé par le design system, posé
 * une fois ici via l'utilitaire `field-focus`.
 */

const CONTROL =
  'w-full rounded-control border border-hairline bg-surface-1 px-3 text-body-md text-ink placeholder:text-faint field-focus transition-colors'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (id: string) => ReactNode
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label tracking-wide text-muted uppercase">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-body-sm text-critical-text">{error}</p>
      ) : hint ? (
        <p className="text-body-sm text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
}

export function TextField({ label, hint, error, className = '', ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (
        <input
          id={id}
          className={`${CONTROL} h-10 ${error ? 'border-critical' : ''} ${className}`}
          {...rest}
        />
      )}
    </Field>
  )
}

/** Champ horaire : chiffres tabulaires, sinon « 09:00 » et « 11:11 » n'ont
 *  pas la même largeur et les colonnes du formulaire dansent. */
export function TimeField({ label, hint, error, className = '', ...rest }: TextFieldProps) {
  return (
    <TextField
      label={label}
      hint={hint}
      error={error}
      type="time"
      className={`tabular ${className}`}
      {...rest}
    />
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  hint?: string
  error?: string
}

export function SelectField({
  label,
  hint,
  error,
  className = '',
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (
        <div className="relative">
          <select
            id={id}
            className={`${CONTROL} h-10 appearance-none pr-9 ${className}`}
            {...rest}
          >
            {children}
          </select>
          <IconChevronDown
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint"
          />
        </div>
      )}
    </Field>
  )
}

/** Select compact des barres d'outils — pas de libellé au-dessus. */
export function InlineSelect({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`h-9 appearance-none rounded-control border border-hairline bg-surface-1 pr-9 pl-3 text-body-sm text-ink field-focus transition-colors ${className}`}
        {...rest}
      >
        {children}
      </select>
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-faint"
      />
    </div>
  )
}
