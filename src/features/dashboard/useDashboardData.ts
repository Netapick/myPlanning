import { useMemo } from 'react'
import { workedMinutes } from '@/lib/time'
import type { Employee, Shift } from '@/lib/types'
import { isToday, isoWeekday, toIso, weekDays } from '@/lib/week'
import { useDataStore } from '@/store/data'

export interface DayTotal {
  date: Date;
  iso: string;
  minutes: number;
  isToday: boolean
}

export interface UpcomingShift {
  shift: Shift
  employee: Employee
  /** Horodatage de début, pour trier et pour juger "en cours" / "à venir". */
  startsAt: Date
  endsAt: Date
}

export interface DashboardData {
  activeCount: number
  weeklyMinutes: number
  occupancyRate: number
  dayTotals: DayTotal[]
  upcoming: UpcomingShift[]
}

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
      occupancyRate: 0,
      dayTotals: [],
      upcoming: [],
    }
    if (!document) return empty

    const now = new Date()
    const days = weekDays(now)
    const isoDays = days.map(toIso)
    const activeEmployees = document.employees.filter(
      (employee) => !employee.archived && employee.status !== 'inactif',
    )
    const employeeById = new Map(document.employees.map((employee) => [employee.id, employee]))

    const weekShifts = document.shifts.filter((shift) => isoDays.includes(shift.date))

    const minutesByDay = new Map<string, number>()
    for (const shift of weekShifts) {
      const minutes = workedMinutes(shift.start, shift.end, shift.breakMinutes)
      minutesByDay.set(shift.date, (minutesByDay.get(shift.date) ?? 0) + minutes)
    }

    const dayTotals: DayTotal[] = days.map((date) => {
      const iso = toIso(date)
      return { date, iso, minutes: minutesByDay.get(iso) ?? 0, isToday: isToday(date) }
    })

    const weeklyMinutes = dayTotals.reduce((total, day) => total + day.minutes, 0)

    // Occupation = heures planifiées / somme des quotas contractuels des
    // personnes actives ce jour d'ouverture — un repère de charge, pas une
    // mesure de présence réelle.
    const openingWeeklyQuota = activeEmployees.reduce((total, employee) => {
      const openDaysCount = document.settings.openingDays.length
      return total + (employee.contract.weeklyHours * 60 * openDaysCount) / 5
    }, 0)
    const occupancyRate = openingWeeklyQuota > 0 ? weeklyMinutes / openingWeeklyQuota : 0

    const upcoming: UpcomingShift[] = document.shifts
      .map((shift) => {
        const employee = employeeById.get(shift.employeeId)
        if (!employee || employee.archived) return null
        const startsAt = new Date(`${shift.date}T${shift.start}:00`)
        const endsAt = new Date(startsAt)
        const [eh = 0, em = 0] = shift.end.split(':').map(Number)
        endsAt.setHours(eh, em, 0, 0)
        if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)
        return { shift, employee, startsAt, endsAt }
      })
      .filter((entry): entry is UpcomingShift => entry !== null && entry.endsAt >= now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 6)

    return {
      activeCount: activeEmployees.filter((employee) => employee.status === 'actif').length,
      weeklyMinutes,
      occupancyRate,
      dayTotals,
      upcoming,
    }
  }, [document])
}

export const isOpeningDay = (date: Date, openingDays: number[]) =>
  openingDays.includes(isoWeekday(date))
