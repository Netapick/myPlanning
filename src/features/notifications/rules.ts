import { activeEventFor } from '@/lib/events'
import { absoluteSpan, formatHours, spanMinutes } from '@/lib/time'
import { EVENT_TYPE_LABELS, FIXED_TERM_CONTRACTS, fullName } from '@/lib/types'
import type { PlanningData, Shift } from '@/lib/types'
import { daysFromToday, isoWeekday, longDateLabel, toIso, weekDays } from '@/lib/week'

/**
 * Le moteur d'alertes.
 *
 * Les alertes ne sont jamais stockées : elles sont recalculées à partir du
 * document à chaque rendu. Une alerte enregistrée se désynchronise dès que la
 * donnée qui l'a produite change — ici, corriger la cause fait disparaître
 * l'alerte, par construction. Seuls les masquages manuels sont persistés,
 * indexés par une clé stable (règle + cible) reconstruite à l'identique d'un
 * calcul à l'autre.
 */

export type RuleId =
  | 'contract-ending'
  | 'overtime'
  | 'undertime'
  | 'overlap'
  | 'absent-scheduled'
  | 'uncovered-day'

export type Severity = 'critical' | 'serious' | 'warning' | 'info'

export interface Notification {
  /** Clé stable règle+cible — c'est elle qu'on masque. */
  key: string
  rule: RuleId
  severity: Severity
  title: string
  detail: string
  /** Route vers laquelle envoyer au clic. */
  link: string
}

export const RULE_LABELS: Record<RuleId, string> = {
  'contract-ending': 'Fin de contrat proche',
  overtime: 'Dépassement du quota hebdomadaire',
  undertime: 'Quota hebdomadaire non atteint',
  overlap: 'Créneaux qui se chevauchent',
  'absent-scheduled': 'Créneau posé sur une personne absente',
  'uncovered-day': 'Jour travaillé sans personne planifiée',
}

export const RULE_DESCRIPTIONS: Record<RuleId, string> = {
  'contract-ending': "Prévient avant l'échéance des CDD, intérims, stages et alternances.",
  overtime: 'Signale les semaines planifiées au-delà du contrat, tolérance comprise.',
  undertime: 'Signale les semaines nettement en dessous du contrat.',
  overlap: 'Détecte deux créneaux simultanés pour la même personne, passage de minuit inclus.',
  'absent-scheduled': 'Détecte un créneau planifié sur quelqu’un en congés ou en arrêt.',
  'uncovered-day': 'Repère les jours d’ouverture où personne n’est planifié.',
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, serious: 1, warning: 2, info: 3 }

/**
 * Calcule toutes les alertes actives pour la semaine affichée.
 *
 * `reference` est la semaine sur laquelle portent les règles hebdomadaires
 * (heures, couverture) : les autres règles, elles, ne dépendent pas d'une
 * semaine particulière.
 */
export function computeNotifications(data: PlanningData, reference: Date): Notification[] {
  const { notifications: config } = data.settings
  const enabled = (rule: RuleId) => config.enabledRules[rule] !== false
  const results: Notification[] = []

  const days = weekDays(reference)
  const weekIsoDates = days.map(toIso)
  const active = data.employees.filter((employee) => !employee.archived)
  const byId = new Map(active.map((employee) => [employee.id, employee]))

  // Créneaux de la semaine affichée, groupés par personne — base commune aux
  // règles d'heures, de chevauchement et d'absence.
  const weekShifts = data.shifts.filter((shift) => weekIsoDates.includes(shift.date))
  const shiftsByEmployee = new Map<string, Shift[]>()
  for (const shift of weekShifts) {
    const list = shiftsByEmployee.get(shift.employeeId)
    if (list) list.push(shift)
    else shiftsByEmployee.set(shift.employeeId, [shift])
  }

  if (enabled('contract-ending')) {
    for (const employee of active) {
      const { endDate, type } = employee.contract
      if (!endDate || !FIXED_TERM_CONTRACTS.includes(type)) continue
      const remaining = daysFromToday(endDate)
      if (remaining < 0 || remaining > config.contractNoticeDays) continue
      results.push({
        key: `contract-ending:${employee.id}:${endDate}`,
        rule: 'contract-ending',
        severity: remaining <= 7 ? 'critical' : 'serious',
        title: `${fullName(employee)} — fin de ${employee.contract.type}`,
        detail:
          remaining === 0
            ? "Le contrat se termine aujourd'hui."
            : `Le contrat se termine dans ${remaining} jour${remaining > 1 ? 's' : ''} (${longDateLabel(new Date(`${endDate}T12:00:00`))}).`,
        link: '/personnel',
      })
    }
  }

  for (const employee of active) {
    const shifts = shiftsByEmployee.get(employee.id) ?? []
    const minutes = shifts.reduce(
      (total, shift) => total + spanMinutes(shift.start, shift.end),
      0,
    )
    const quota = employee.contract.weeklyHours * 60
    const tolerance = config.hoursTolerance * 60
    const gap = minutes - quota

    if (enabled('overtime') && gap > tolerance) {
      results.push({
        key: `overtime:${employee.id}:${weekIsoDates[0]}`,
        rule: 'overtime',
        severity: 'warning',
        title: `${fullName(employee)} — ${formatHours(gap)} au-dessus du contrat`,
        detail: `${formatHours(minutes)} planifiées pour un contrat de ${employee.contract.weeklyHours} h.`,
        link: '/planning',
      })
    }

    // Une personne en événement toute la semaine n'a pas à être signalée en
    // sous-charge : son absence est déjà l'explication. On ne regarde que le
    // premier jour planifié comme repère — un cas limite acceptable ici.
    const hasWeekLongEvent = weekIsoDates.every(
      (date) => activeEventFor(data.events, employee.id, date) !== undefined,
    )
    if (
      enabled('undertime') &&
      gap < -tolerance &&
      employee.status === 'actif' &&
      !hasWeekLongEvent &&
      shifts.length > 0
    ) {
      results.push({
        key: `undertime:${employee.id}:${weekIsoDates[0]}`,
        rule: 'undertime',
        severity: 'info',
        title: `${fullName(employee)} — ${formatHours(-gap)} sous le contrat`,
        detail: `${formatHours(minutes)} planifiées pour un contrat de ${employee.contract.weeklyHours} h.`,
        link: '/planning',
      })
    }

    if (enabled('overlap')) {
      // Les bornes sont ramenées en minutes absolues depuis le lundi : c'est
      // le seul moyen de voir qu'une nuit 22:00→06:00 mord sur le matin
      // 07:00 du lendemain, qui est un autre jour du document.
      const spans = shifts
        .map((shift) => ({
          shift,
          ...absoluteSpan(weekIsoDates.indexOf(shift.date), shift.start, shift.end),
        }))
        .sort((a, b) => a.from - b.from)

      for (let i = 1; i < spans.length; i += 1) {
        const previous = spans[i - 1]
        const current = spans[i]
        if (!previous || !current || current.from >= previous.to) continue
        results.push({
          key: `overlap:${previous.shift.id}:${current.shift.id}`,
          rule: 'overlap',
          severity: 'critical',
          title: `${fullName(employee)} — deux créneaux se chevauchent`,
          detail: `« ${previous.shift.label} » (${previous.shift.start}-${previous.shift.end}) et « ${current.shift.label} » (${current.shift.start}-${current.shift.end}).`,
          link: '/planning',
        })
      }
    }

    if (enabled('absent-scheduled')) {
      for (const shift of shifts) {
        const event = activeEventFor(data.events, employee.id, shift.date)
        if (!event) continue
        results.push({
          key: `absent-scheduled:${shift.id}`,
          rule: 'absent-scheduled',
          severity: 'serious',
          title: `${fullName(employee)} est planifié·e alors qu'il/elle est absent·e`,
          detail: `« ${shift.label} » le ${longDateLabel(new Date(`${shift.date}T12:00:00`))} — ${EVENT_TYPE_LABELS[event.type].toLowerCase()}.`,
          link: '/planning',
        })
      }
    }
  }

  if (enabled('uncovered-day')) {
    for (const day of days) {
      if (!data.settings.openingDays.includes(isoWeekday(day))) continue
      const iso = toIso(day)
      const covered = weekShifts.some((shift) => shift.date === iso && byId.has(shift.employeeId))
      if (covered) continue
      results.push({
        key: `uncovered-day:${iso}`,
        rule: 'uncovered-day',
        severity: 'warning',
        title: `${longDateLabel(day)} — personne de planifié`,
        detail: "C'est un jour d'ouverture et aucun créneau n'y est posé.",
        link: '/planning',
      })
    }
  }

  const dismissed = new Set(config.dismissed)
  return results
    .filter((notification) => !dismissed.has(notification.key))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
