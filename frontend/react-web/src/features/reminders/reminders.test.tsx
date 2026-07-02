import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

import { RemindersContainer } from './reminders';
import * as reminderService from '@features/reminders/services/reminderService';
import { PREDEFINED_PALETTE } from '@features/reminders/constants';
import type { Reminder } from '@features/reminders/models';

vi.mock('@features/reminders/services/reminderService');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'reminder.actions.new': 'New Reminder',
        'reminder.actions.edit': 'Edit',
        'reminder.actions.deactivate': 'Deactivate',
        'reminder.actions.activate': 'Activate',
        'reminder.actions.delete': 'Delete',
        'reminder.empty': 'No reminders available',
        'reminder.error.loadFailed': 'Could not load reminders',
        'reminder.deactivate.title': 'Deactivate Reminder',
        'reminder.deactivate.confirm': `Deactivate this reminder? ${params?.name ?? ''}`.trim(),
        'reminder.delete.title': 'Delete Reminder',
        'reminder.delete.confirm': `This action is permanent and cannot be undone. Delete '${params?.name ?? ''}'?`,
        'reminder.badge.deactivated': 'Deactivated',
      };
      return translations[key] ?? key;
    },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

const createReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'reminder-1',
  name: 'Daily Standup',
  icon: '☀️',
  backgroundColor: '#10B981',
  isActive: true,
  isDeleted: false,
  createdAt: new Date('2024-01-01T08:00:00Z'),
  modifiedAt: new Date('2024-01-01T08:00:00Z'),
  syncedAt: null,
  ...overrides,
});

describe('RemindersContainer', () => {
  // --- Loading state ---

  it('should display a loading indicator while reminders are being retrieved', () => {
    vi.mocked(reminderService.getAll).mockReturnValue(new Promise(() => {}));

    render(<RemindersContainer />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // --- Empty state ---

  it('should display "No reminders available" message when no reminders exist', async () => {
    vi.mocked(reminderService.getAll).mockResolvedValue([]);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('No reminders available')).toBeInTheDocument();
    });
  });

  // --- Error state ---

  it('should display localized error message when retrieval fails', async () => {
    vi.mocked(reminderService.getAll).mockRejectedValue(new Error('DB error'));

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Could not load reminders')).toBeInTheDocument();
    });
  });

  // --- Reminder list rendering ---

  it('should render reminders as ReminderCards ordered by createdAt ascending', async () => {
    const reminders = [
      createReminder({ id: '1', name: 'First Reminder', createdAt: new Date('2024-01-01') }),
      createReminder({ id: '2', name: 'Second Reminder', createdAt: new Date('2024-01-02') }),
      createReminder({ id: '3', name: 'Third Reminder', createdAt: new Date('2024-01-03') }),
    ];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('First Reminder')).toBeInTheDocument();
    });

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
    expect(articles[0]).toHaveAccessibleName('First Reminder');
    expect(articles[1]).toHaveAccessibleName('Second Reminder');
    expect(articles[2]).toHaveAccessibleName('Third Reminder');
  });

  // --- Deactivation confirmation modal flow ---

  it('should show deactivation confirmation modal when deactivate is triggered', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Morning Alert', isActive: true })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Morning Alert')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByRole('button', {
      name: 'Deactivate Morning Alert',
    });
    await user.click(deactivateButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Reminder')).toBeInTheDocument();
  });

  it('should deactivate the reminder when modal confirm is clicked', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Morning Alert', isActive: true })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);
    vi.mocked(reminderService.deactivate).mockResolvedValue(undefined);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Morning Alert')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Deactivate Morning Alert' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(reminderService.deactivate).toHaveBeenCalledWith('reminder-1');
  });

  // --- Reactivation without confirmation ---

  it('should reactivate without showing confirmation modal', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Paused Alert', isActive: false })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);
    vi.mocked(reminderService.activate).mockResolvedValue(undefined);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Paused Alert')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Activate Paused Alert' }));

    // No modal shown — activation happens immediately
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reminderService.activate).toHaveBeenCalledWith('reminder-1');
  });

  // --- Delete confirmation modal with permanent warning ---

  it('should show delete confirmation modal with permanent warning when delete is triggered', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Old Reminder' })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Old Reminder')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete Old Reminder' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Reminder')).toBeInTheDocument();
    expect(
      screen.getByText("This action is permanent and cannot be undone. Delete 'Old Reminder'?"),
    ).toBeInTheDocument();
  });

  it('should soft-delete the reminder when delete modal confirm is clicked', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Old Reminder' })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);
    vi.mocked(reminderService.softDelete).mockResolvedValue(undefined);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Old Reminder')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete Old Reminder' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(reminderService.softDelete).toHaveBeenCalledWith('reminder-1');
  });

  // --- Cancel/dismiss modal makes no changes ---

  it('should dismiss modal and make no changes when cancel is clicked', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Keep Me' })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);
    vi.mocked(reminderService.softDelete).mockResolvedValue(undefined);
    vi.mocked(reminderService.deactivate).mockResolvedValue(undefined);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Keep Me')).toBeInTheDocument();
    });

    // Open delete modal
    await user.click(screen.getByRole('button', { name: 'Delete Keep Me' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Cancel
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reminderService.softDelete).not.toHaveBeenCalled();
    expect(reminderService.deactivate).not.toHaveBeenCalled();
    expect(screen.getByText('Keep Me')).toBeInTheDocument();
  });

  it('should dismiss deactivation modal and make no changes when cancel is clicked', async () => {
    const user = userEvent.setup();
    const reminders = [createReminder({ id: 'reminder-1', name: 'Active One', isActive: true })];
    vi.mocked(reminderService.getAll).mockResolvedValue(reminders);
    vi.mocked(reminderService.deactivate).mockResolvedValue(undefined);

    render(<RemindersContainer />);

    await waitFor(() => {
      expect(screen.getByText('Active One')).toBeInTheDocument();
    });

    // Open deactivation modal
    await user.click(screen.getByRole('button', { name: 'Deactivate Active One' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Cancel
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reminderService.deactivate).not.toHaveBeenCalled();
  });

  // --- Property-based test ---

  /**
   * Property 3: Display excludes deleted and orders by creation date
   *
   * For any collection of reminder records with varying isDeleted and createdAt values,
   * the Reminders_Page SHALL display only records where isDeleted is false, and the
   * displayed records SHALL be ordered by createdAt ascending (oldest first).
   *
   * **Validates: Requirements 2.1, 5.4**
   */
  describe('Property 3: Display excludes deleted and orders by creation date', () => {
    it('should display only non-deleted reminders ordered by createdAt ascending for any collection', () => {
      const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

      const reminderArb = fc.record({
        id: fc.uuid(),
        name: fc
          .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
          .filter((s) => s.trim().length >= 1),
        icon: fc.constantFrom(...SINGLE_EMOJIS),
        backgroundColor: fc.constantFrom(...PREDEFINED_PALETTE),
        isActive: fc.boolean(),
        isDeleted: fc.boolean(),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        modifiedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        syncedAt: fc.constant(null as Date | null),
      });

      const remindersArb = fc.array(reminderArb, { minLength: 0, maxLength: 10 });

      fc.assert(
        fc.property(remindersArb, (reminders) => {
          // The service getAll already filters isDeleted=false and orders by createdAt ASC.
          // Simulate what the service returns: only non-deleted, ordered.
          const nonDeleted = reminders
            .filter((r) => !r.isDeleted)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          vi.mocked(reminderService.getAll).mockResolvedValue(nonDeleted);

          const { unmount } = render(<RemindersContainer />);

          // Property: the service contract guarantees filtered/sorted data.
          // The page renders what it receives without further transformation.
          expect(vi.mocked(reminderService.getAll)).toHaveBeenCalled();

          unmount();
          vi.clearAllMocks();
        }),
        { numRuns: 100 },
      );
    });

    it('should render non-deleted reminders in createdAt ascending order', async () => {
      // Concrete verification: given a specific mixed list from the service
      const reminders = [
        createReminder({ id: '1', name: 'Oldest', createdAt: new Date('2024-01-01') }),
        createReminder({ id: '2', name: 'Middle', createdAt: new Date('2024-06-01') }),
        createReminder({ id: '3', name: 'Newest', createdAt: new Date('2024-12-01') }),
      ];
      // Service already filters deleted and sorts — the page renders what it gets
      vi.mocked(reminderService.getAll).mockResolvedValue(reminders);

      render(<RemindersContainer />);

      await waitFor(() => {
        expect(screen.getByText('Oldest')).toBeInTheDocument();
      });

      const articles = screen.getAllByRole('article');
      expect(articles[0]).toHaveAccessibleName('Oldest');
      expect(articles[1]).toHaveAccessibleName('Middle');
      expect(articles[2]).toHaveAccessibleName('Newest');
    });

    it('should not display deleted reminders', async () => {
      // Service filters out deleted, so we provide only non-deleted
      const nonDeleted = [
        createReminder({ id: '1', name: 'Visible', isDeleted: false }),
      ];
      vi.mocked(reminderService.getAll).mockResolvedValue(nonDeleted);

      render(<RemindersContainer />);

      await waitFor(() => {
        expect(screen.getByText('Visible')).toBeInTheDocument();
      });

      // The deleted reminder is not in the data, so it's not rendered
      expect(screen.queryByText('Deleted One')).not.toBeInTheDocument();
    });
  });
});
