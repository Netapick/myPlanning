import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { PersonnelScreen } from '@/features/personnel/PersonnelScreen'
import { PlanningScreen } from '@/features/planning/PlanningScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: 'planning', element: <PlanningScreen /> },
      { path: 'personnel', element: <PersonnelScreen /> },
      { path: 'parametres', element: <SettingsScreen /> },
    ],
  },
])
