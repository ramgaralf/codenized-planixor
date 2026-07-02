import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationSettingsSection } from './NotificationSettingsSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.notifications': 'Notifications',
        'settings.notificationChannelApp': 'App',
        'settings.notificationChannelSystem': 'System',
        'settings.notificationChannelBoth': 'Both',
        'settings.notificationPermissionWarning':
          'System notifications are blocked. Enable them in browser settings.',
      };
      return translations[key] ?? key;
    },
  }),
}));

const mockGetChannel = vi.fn();
const mockSetChannel = vi.fn();

vi.mock('../services/notificationSettings', () => ({
  getChannel: () => mockGetChannel(),
  setChannel: (...args: unknown[]) => mockSetChannel(...args),
}));

const mockRequestSystemPermission = vi.fn();
const mockIsSystemPermissionDenied = vi.fn();

vi.mock('../services/notificationPermissions', () => ({
  requestSystemPermission: () => mockRequestSystemPermission(),
  isSystemPermissionDenied: () => mockIsSystemPermissionDenied(),
}));

describe('NotificationSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChannel.mockResolvedValue('both');
    mockSetChannel.mockResolvedValue(undefined);
    mockIsSystemPermissionDenied.mockReturnValue(false);
    mockRequestSystemPermission.mockResolvedValue({ granted: true, showGuidance: false });
  });

  it('should render the notifications section title', async () => {
    render(<NotificationSettingsSection />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    });
  });

  it('should render three channel options: App, System, Both', async () => {
    render(<NotificationSettingsSection />);
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeInTheDocument();
    });
    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Both' })).toBeInTheDocument();
  });

  it('should select the persisted channel on load', async () => {
    mockGetChannel.mockResolvedValue('app');
    render(<NotificationSettingsSection />);
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeChecked();
    });
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Both' })).not.toBeChecked();
  });

  it('should default to "Both" when no persisted value', async () => {
    mockGetChannel.mockResolvedValue('both');
    render(<NotificationSettingsSection />);
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Both' })).toBeChecked();
    });
  });

  it('should persist "App" immediately on selection without permission request', async () => {
    const user = userEvent.setup();
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Both' })).toBeChecked();
    });

    await user.click(screen.getByRole('radio', { name: 'App' }));

    expect(mockRequestSystemPermission).not.toHaveBeenCalled();
    expect(mockSetChannel).toHaveBeenCalledWith('app');
  });

  it('should request permission when "System" is selected', async () => {
    mockGetChannel.mockResolvedValue('app');
    const user = userEvent.setup();
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeChecked();
    });

    await user.click(screen.getByRole('radio', { name: 'System' }));

    expect(mockRequestSystemPermission).toHaveBeenCalled();
    expect(mockSetChannel).toHaveBeenCalledWith('system');
  });

  it('should request permission when "Both" is selected', async () => {
    mockGetChannel.mockResolvedValue('app');
    const user = userEvent.setup();
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeChecked();
    });

    await user.click(screen.getByRole('radio', { name: 'Both' }));

    expect(mockRequestSystemPermission).toHaveBeenCalled();
    expect(mockSetChannel).toHaveBeenCalledWith('both');
  });

  it('should revert to "App" and show warning when permission is denied', async () => {
    mockGetChannel.mockResolvedValue('app');
    mockRequestSystemPermission.mockResolvedValue({ granted: false, showGuidance: true });
    const user = userEvent.setup();
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeChecked();
    });

    await user.click(screen.getByRole('radio', { name: 'System' }));

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeChecked();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'System notifications are blocked. Enable them in browser settings.',
    );
    expect(mockSetChannel).toHaveBeenCalledWith('app');
  });

  it('should show inline warning on load when "System" selected but permission denied', async () => {
    mockGetChannel.mockResolvedValue('system');
    mockIsSystemPermissionDenied.mockReturnValue(true);
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'System notifications are blocked. Enable them in browser settings.',
      );
    });
  });

  it('should show inline warning on load when "Both" selected but permission denied', async () => {
    mockGetChannel.mockResolvedValue('both');
    mockIsSystemPermissionDenied.mockReturnValue(true);
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'System notifications are blocked. Enable them in browser settings.',
      );
    });
  });

  it('should not show warning on load when channel is "App"', async () => {
    mockGetChannel.mockResolvedValue('app');
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'App' })).toBeChecked();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should clear warning when switching to "App"', async () => {
    mockGetChannel.mockResolvedValue('system');
    mockIsSystemPermissionDenied.mockReturnValue(true);
    const user = userEvent.setup();
    render(<NotificationSettingsSection />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('radio', { name: 'App' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('should have a radiogroup with accessible label', async () => {
    render(<NotificationSettingsSection />);
    await waitFor(() => {
      expect(screen.getByRole('radiogroup', { name: 'Notifications' })).toBeInTheDocument();
    });
  });
});
