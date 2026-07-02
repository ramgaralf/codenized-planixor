import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CalendarDashboard } from '@/pages/CalendarDashboard';
import { ShiftsPage } from '@/pages/ShiftsPage';
import { ShiftNewPage } from '@/pages/ShiftNewPage';
import { ShiftEditPage } from '@/pages/ShiftEditPage';
import { RemindersPage } from '@/pages/RemindersPage';
import { ReminderNewPage } from '@/pages/ReminderNewPage';
import { ReminderEditPage } from '@/pages/ReminderEditPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { SyncConfigScreen } from '@features/sync/components/SyncConfigScreen';
import { SyncScreen } from '@features/sync/components/SyncScreen';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppLayout
      sidebar={<Sidebar />}
      bottomNav={<BottomNav />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <HeaderBar />
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {children}
        </div>
      </div>
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
    path: '/shifts/new',
    element: (
      <AppShell>
        <ShiftNewPage />
      </AppShell>
    ),
  },
  {
    path: '/shifts/:id/edit',
    element: (
      <AppShell>
        <ShiftEditPage />
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
    path: '/reminders/new',
    element: (
      <AppShell>
        <ReminderNewPage />
      </AppShell>
    ),
  },
  {
    path: '/reminders/:id/edit',
    element: (
      <AppShell>
        <ReminderEditPage />
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
  {
    path: '/sync/config',
    element: (
      <AppShell>
        <SyncConfigScreen />
      </AppShell>
    ),
  },
  {
    path: '/sync',
    element: (
      <AppShell>
        <SyncScreen />
      </AppShell>
    ),
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicyPage />,
  },
]);
