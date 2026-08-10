import { useMemo } from 'react'
import { employeeBalances } from '@/lib/balances'
import { spanMinutes } from '@/lib/time'
import { FIXED_TERM_CONTRACTS } from '@/lib/types'
import type { ContractType, Employee, Event } from '@/lib/types'
import { daysFromToday, isoWeekday, toIso, weekDays } from '@/lib/week'
import { useDataStore } from '@/store/data'

export interface UpcomingEventItem {
  kind: 'event'
  employee: Employee
  event: Event
  /** Solde d'heures sup. restantes de la personne, pour l'indication de récupération. */
  overtimeRemainingMinutes: number
  /** Date de tri — début de l'événement. */
  sortDate: string
}

export interface UpcomingContractEndItem {
  kind: 'contract-ending'
  employee: Employee
  endDate: string
  contractType: ContractType
  /** Jours restants avant l'échéance — pilote l'urgence affichée. */
  remainingDays: number
  /** Date de tri — échéance du contrat. */
  sortDate: string
}

export type UpcomingItem = UpcomingEventItem | UpcomingContractEndItem

export interface TeamBalanceAlert {
  employee: Employee
  leaveRemaining: number
  overtimeRemainingMinutes: number
  leaveLow: boolean
  overtimeHigh: boolean
}

export interface DashboardData {
  activeCount: number
  weeklyMinutes: number
  upcomingItems: UpcomingItem[]
  balanceAlerts: TeamBalanceAlert[]
}

/** Seuils d'alerte — CP restants au plancher, heures sup. qui s'accumulent. */
const LEAVE_LOW_DAYS = 2
const OVERTIME_HIGH_MINUTES = 600

/**
 * Tous les agrégats du tableau de bord, calculés une seule fois par rendu.
 * Centralisés ici pour que l'écran ne fasse que de l'affichage.
 */
export function useDashboardData(): DashboardData {
  const document = useDataStore((state) => state.document)

  return useMemo(() => {
    const empty: DashboardData = {
      activeCount: 0,
      weeklyMinutes: 0,
      upcomingItems: [],
      balanceAlerts: [],
    }
    if (!document) return empty

    const now = new Date()
    const today = toIso(now)
    const days = weekDays(now)
    const isoDays = days.map(toIso)
    const activeEmployees = document.employees.filter(
      (employee) => !employee.archived && employee.status !== 'inactif',
    )
    const employeeById = new Map(document.employees.map((employee) => [employee.id, employee]))

    const weekShifts = document.shifts.filter((shift) => isoDays.includes(shift.date))
    const weeklyMinutes = weekShifts.reduce(
      (total, shift) => total + spanMinutes(shift.start, shift.end),
      0,
    )

    const upcomingEvents: UpcomingEventItem[] = document.events
      .map((event) => {
        const employee = employeeById.get(event.employeeId)
        if (!employee || employee.archived) return null
        return {
          kind: 'event' as const,
          event,
          employee,
          overtimeRemainingMinutes: employeeBalances(employee, document.events, document.shifts).overtimeRemainingMinutes,
          sortDate: event.startDate,
        }
      })
      .filter((entry): entry is UpcomingEventItem => entry !== null && entry.event.endDate >= today)

    // Même fenêtre d'alerte que la notification « Fin de contrat proche »
    // (Paramètres > Notifications) : une échéance de CDD/intérim/stage/
    // alternance mérite d'apparaître ici aussi, pas seulement dans la cloche.
    const contractNoticeDays = document.settings.notifications.contractNoticeDays
    const contractEndingEnabled = document.settings.notifications.enabledRules['contract-ending'] !== false
    const upcomingContractEnds: UpcomingContractEndItem[] = contractEndingEnabled
      ? document.employees
          .filter((employee) => !employee.archived)
          .map((employee) => {
            const { endDate, type } = employee.contract
            if (!endDate || !FIXED_TERM_CONTRACTS.includes(type)) return null
            const remainingDays = daysFromToday(endDate)
            if (remainingDays < 0 || remainingDays > contractNoticeDays) return null
            return {
              kind: 'contract-ending' as const,
              employee,
              endDate,
              contractType: type,
              remainingDays,
              sortDate: endDate,
            }
          })
          .filter((entry): entry is UpcomingContractEndItem => entry !== null)
      : []

    const upcomingItems: UpcomingItem[] = [...upcomingEvents, ...upcomingContractEnds]
      .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
      .slice(0, 6)

    // Toute la liste active, pas seulement les cas alarmants — les heures
    // sup. doivent être visibles en continu, pas seulement une fois « élevées »
    // (`overtimeHigh`/`leaveLow` restent comme simples indicateurs de badge).
    const balanceAlerts: TeamBalanceAlert[] = activeEmployees
      .map((employee) => {
        const balances = employeeBalances(employee, document.events, document.shifts)
        const leaveLow = employee.leaveBalance.accrued > 0 && balances.leaveRemaining <= LEAVE_LOW_DAYS
        const overtimeHigh = balances.overtimeRemainingMinutes >= OVERTIME_HIGH_MINUTES
        return {
          employee,
          leaveRemaining: balances.leaveRemaining,
          overtimeRemainingMinutes: balances.overtimeRemainingMinutes,
          leaveLow,
          overtimeHigh,
        }
      })
      .sort((a, b) => {
        const scoreOf = (alert: TeamBalanceAlert) =>
          (alert.leaveLow ? LEAVE_LOW_DAYS - alert.leaveRemaining : 0) +
          (alert.overtimeHigh ? alert.overtimeRemainingMinutes / 60 : 0)
        return scoreOf(b) - scoreOf(a)
      })

    return {
      activeCount: activeEmployees.filter((employee) => employee.status === 'actif').length,
      weeklyMinutes,
      upcomingItems,
      balanceAlerts,
    }
  }, [document])
}

export const isOpeningDay = (date: Date, openingDays: number[]) =>
  openingDays.includes(isoWeekday(date))
