import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock useSyncStore
const mockLoadConfig = vi.fn();
vi.mock('@features/sync/stores/syncStore', () => {
  const store = () => ({
    connectionStatus: 'unconfigured' as const,
    config: null,
  });
  store.getState = () => ({ loadConfig: mockLoadConfig });
  return { useSyncStore: store };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    // Calendar page: new event + bell + sync button = 3 buttons
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
  it('should not render the new event button on non-calendar pages', () => {
    renderHeaderBar(['/settings']);
    // Settings page: bell + sync button = 2 buttons
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
  it('should render the sync button with accessible label', () => {
    renderHeaderBar();
    expect(screen.getByRole('button', { name: /sync status/i })).toBeInTheDocument();
  });
  it('should render as a header element', () => {
    renderHeaderBar();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
  it('should display the page title', () => {
    renderHeaderBar(['/']);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
  it('should navigate to /sync/config when sync button is clicked and config is absent', async () => {
    const user = userEvent.setup();
    renderHeaderBar();
    const syncButton = screen.getByRole('button', { name: /sync status/i });
    await user.click(syncButton);
    expect(mockNavigate).toHaveBeenCalledWith('/sync/config');
  });
  it('should load sync config on mount', () => {
    renderHeaderBar();
    expect(mockLoadConfig).toHaveBeenCalled();
  });
});
