import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { FAB } from '@/components/shared/FAB';
import { CalendarDashboard } from '@/pages/CalendarDashboard';
import { ShiftsPage } from '@/pages/ShiftsPage';
import { RemindersPage } from '@/pages/RemindersPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppLayout
      sidebar={<Sidebar />}
      bottomNav={<BottomNav />}
      fab={<FAB />}
    >
      {children}
    </AppLayout>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <CalendarDashboard />
      </AppShell>
    ),
  },
  {
    path: '/shifts',
    element: (
      <AppShell>
        <ShiftsPage />
      </AppShell>
    ),
  },
  {
    path: '/reminders',
    element: (
      <AppShell>
        <RemindersPage />
      </AppShell>
    ),
  },
  {
    path: '/reports',
    element: (
      <AppShell>
        <ReportsPage />
      </AppShell>
    ),
  },
  {
    path: '/settings',
    element: (
      <AppShell>
        <SettingsPage />
      </AppShell>
    ),
  },
]);
