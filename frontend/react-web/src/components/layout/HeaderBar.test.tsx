import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/infrastructure/i18n';
import { HeaderBar } from './HeaderBar';

// Mock useNotifications to avoid Dexie live queries in tests
vi.mock('@features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    channel: 'both' as const,
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

// Mock notificationWorkerManager to prevent Worker registration
vi.mock('@features/notifications/services/notificationWorkerManager', () => ({
  subscribeToBadgeCount: (cb: (count: number) => void) => {
    cb(0);
    return () => {};
  },
  getUnreadCountFromWorker: () => 0,
}));

beforeAll(async () => { await i18n.changeLanguage('en'); });

const renderHeaderBar = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <I18nextProvider i18n={i18n}>
        <HeaderBar />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('HeaderBar', () => {
  it('should render the notification bell button with accessible label', () => {
    renderHeaderBar();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });
  it('should render the new event button on calendar page', () => {
    renderHeaderBar(['/']);
    // Calendar page: new event + bell + avatar = 3 buttons
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
  it('should not render the new event button on non-calendar pages', () => {
    renderHeaderBar(['/settings']);
    // Settings page: bell + avatar = 2 buttons
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
  it('should render the user avatar button with accessible label', () => {
    renderHeaderBar();
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });
  it('should render as a header element', () => {
    renderHeaderBar();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
  it('should display the page title', () => {
    renderHeaderBar(['/']);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});
