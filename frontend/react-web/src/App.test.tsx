import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { App } from './App';

// Mock notification hook and worker manager to prevent async IndexedDB leaks
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

vi.mock('@features/notifications/services/notificationWorkerManager', () => ({
  registerNotificationWorker: vi.fn(),
  subscribeToBadgeCount: (cb: (count: number) => void) => {
    cb(0);
    return () => {};
  },
  getUnreadCountFromWorker: () => 0,
  unregisterNotificationWorker: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('theme-light', 'theme-dark');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('should render the application with routing and theme provider', () => {
    render(<App />);

    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(screen.getAllByRole('navigation', { name: /main navigation/i }).length).toBeGreaterThan(0);
  });

  it('should render the calendar dashboard as the default route', () => {
    render(<App />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
