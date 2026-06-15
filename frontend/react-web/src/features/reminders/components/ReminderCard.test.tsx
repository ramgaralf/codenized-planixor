import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

import { ReminderCard } from './ReminderCard';
import { PREDEFINED_PALETTE } from '../constants';
import type { Reminder } from '../models';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'reminder.badge.deactivated': 'Deactivated',
        'reminder.actions.edit': 'Edit',
        'reminder.actions.deactivate': 'Deactivate',
        'reminder.actions.activate': 'Activate',
        'reminder.actions.delete': 'Delete',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'reminder-1',
  name: 'Daily Standup',
  icon: '☀️',
  backgroundColor: '#10B981',
  isActive: true,
  isDeleted: false,
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01'),
  syncedAt: null,
  ...overrides,
});

const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

describe('ReminderCard', () => {
  const defaultProps = {
    onEdit: vi.fn(),
    onDeactivate: vi.fn(),
    onActivate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering data elements ---

  it('should display reminder name when rendered', () => {
    render(<ReminderCard reminder={createReminder()} {...defaultProps} />);

    expect(screen.getByText('Daily Standup')).toBeInTheDocument();
  });

  it('should display reminder icon when rendered', () => {
    render(<ReminderCard reminder={createReminder()} {...defaultProps} />);

    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('should render the left color indicator with the reminder background color', () => {
    const { container } = render(
      <ReminderCard
        reminder={createReminder({ backgroundColor: '#EF4444' })}
        {...defaultProps}
      />,
    );

    const colorIndicator = container.querySelector('article > [aria-hidden="true"]');
    expect(colorIndicator).toHaveStyle({ backgroundColor: '#EF4444' });
  });

  // --- Deactivated visual indicators ---

  it('should show reduced opacity when reminder is deactivated', () => {
    render(
      <ReminderCard reminder={createReminder({ isActive: false })} {...defaultProps} />,
    );

    const card = screen.getByRole('article');
    expect(card).toHaveStyle({ opacity: '0.5' });
  });

  it('should show full opacity when reminder is active', () => {
    render(
      <ReminderCard reminder={createReminder({ isActive: true })} {...defaultProps} />,
    );

    const card = screen.getByRole('article');
    expect(card).toHaveStyle({ opacity: '1' });
  });

  it('should display "Deactivated" badge when isActive is false', () => {
    render(
      <ReminderCard reminder={createReminder({ isActive: false })} {...defaultProps} />,
    );

    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('should not display "Deactivated" badge when isActive is true', () => {
    render(
      <ReminderCard reminder={createReminder({ isActive: true })} {...defaultProps} />,
    );

    expect(screen.queryByText('Deactivated')).not.toBeInTheDocument();
  });

  // --- Action callbacks ---

  it('should call onEdit with reminder id when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReminderCard reminder={createReminder()} {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(defaultProps.onEdit).toHaveBeenCalledWith('reminder-1');
  });

  it('should call onDeactivate with reminder id when toggle button is clicked on active reminder', async () => {
    const user = userEvent.setup();
    render(
      <ReminderCard reminder={createReminder({ isActive: true })} {...defaultProps} />,
    );

    await user.click(screen.getByRole('button', { name: /deactivate/i }));

    expect(defaultProps.onDeactivate).toHaveBeenCalledWith('reminder-1');
  });

  it('should call onActivate with reminder id when toggle button is clicked on deactivated reminder', async () => {
    const user = userEvent.setup();
    render(
      <ReminderCard reminder={createReminder({ isActive: false })} {...defaultProps} />,
    );

    await user.click(screen.getByRole('button', { name: /activate/i }));

    expect(defaultProps.onActivate).toHaveBeenCalledWith('reminder-1');
  });

  it('should call onDelete with reminder id when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReminderCard reminder={createReminder()} {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(defaultProps.onDelete).toHaveBeenCalledWith('reminder-1');
  });

  // --- Accessibility ---

  it('should have accessible aria-label on the card with reminder name', () => {
    render(<ReminderCard reminder={createReminder()} {...defaultProps} />);

    expect(screen.getByRole('article', { name: 'Daily Standup' })).toBeInTheDocument();
  });

  it('should have accessible labels on action buttons including reminder name', () => {
    render(<ReminderCard reminder={createReminder()} {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Edit Daily Standup' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Deactivate Daily Standup' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete Daily Standup' }),
    ).toBeInTheDocument();
  });

  it('should show activate label on toggle button when reminder is deactivated', () => {
    render(
      <ReminderCard reminder={createReminder({ isActive: false })} {...defaultProps} />,
    );

    expect(
      screen.getByRole('button', { name: 'Activate Daily Standup' }),
    ).toBeInTheDocument();
  });

  // --- Property-based tests ---

  /**
   * Property 4: Card renders all required data elements
   *
   * For any reminder record, the rendered ReminderCard SHALL contain the
   * backgroundColor as a color indicator, the icon, and the name from that record.
   *
   * **Validates: Requirements 2.2**
   */
  describe('Property 4: Card renders all required data elements', () => {
    it('should render backgroundColor, icon, and name for any valid reminder', () => {
      const validNameArb = fc
        .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
        .filter((s) => s.trim().length >= 1 && s.trim().length <= 50)
        .map((s) => s.trim());

      const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);
      const validColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

      fc.assert(
        fc.property(validNameArb, validIconArb, validColorArb, (name, icon, backgroundColor) => {
          const { container, unmount } = render(
            <ReminderCard reminder={createReminder({ name, icon, backgroundColor })} {...defaultProps} />,
          );

          const card = within(container as HTMLElement);

          // Name is rendered in the card (use aria-label which equals trimmed name)
          expect(card.getByRole('article', { name })).toBeInTheDocument();

          // Icon is rendered
          expect(card.getByText(icon)).toBeInTheDocument();

          // Background color is applied to the left color indicator
          const colorIndicator = container.querySelector('article > [aria-hidden="true"]');
          expect(colorIndicator).toHaveStyle({ backgroundColor });

          unmount();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Inactive reminder card displays deactivated visual indicators
   *
   * For any reminder with isActive set to false, the rendered ReminderCard SHALL
   * include a localized "Deactivated" badge and apply reduced opacity styling.
   *
   * **Validates: Requirements 4.4**
   */
  describe('Property 8: Inactive reminder card displays deactivated visual indicators', () => {
    it('should show deactivated badge and reduced opacity for any inactive reminder', () => {
      const validNameArb = fc
        .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
        .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

      const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);
      const validColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

      fc.assert(
        fc.property(validNameArb, validIconArb, validColorArb, (name, icon, backgroundColor) => {
          const { container, unmount } = render(
            <ReminderCard reminder={createReminder({ name, icon, backgroundColor, isActive: false })} {...defaultProps} />,
          );

          const card = within(container as HTMLElement);

          // Deactivated badge is present
          expect(card.getByText('Deactivated')).toBeInTheDocument();

          // Reduced opacity applied to the card
          const article = card.getByRole('article');
          expect(article).toHaveStyle({ opacity: '0.5' });

          unmount();
        }),
        { numRuns: 100 },
      );
    });

    it('should not show deactivated badge and should have full opacity for any active reminder', () => {
      const validNameArb = fc
        .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
        .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

      const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);
      const validColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

      fc.assert(
        fc.property(validNameArb, validIconArb, validColorArb, (name, icon, backgroundColor) => {
          const { container, unmount } = render(
            <ReminderCard reminder={createReminder({ name, icon, backgroundColor, isActive: true })} {...defaultProps} />,
          );

          const card = within(container as HTMLElement);

          // No deactivated badge
          expect(card.queryByText('Deactivated')).not.toBeInTheDocument();

          // Full opacity
          const article = card.getByRole('article');
          expect(article).toHaveStyle({ opacity: '1' });

          unmount();
        }),
        { numRuns: 100 },
      );
    });
  });
});
