import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CalendarEventDisplay } from '@features/calendar-events/models';

import { DayActionModal } from './DayActionModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'shiftMode.dayModal.createEvent': 'Create calendar event',
        'shiftMode.dayModal.close': 'Close',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

const createEvent = (overrides: Partial<CalendarEventDisplay>): CalendarEventDisplay => ({
  id: 'event-1',
  eventType: 'shift',
  eventTypeId: 'def-1',
  name: 'Test Event',
  icon: '☀️',
  backgroundColor: '#10B981',
  startDay: '2025-06-15',
  endDay: '2025-06-15',
  startTime: 480,
  endTime: 960,
  totalHours: 480,
  notes: null,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  alertOffsets: [],
  isOrphaned: false,
  ...overrides,
});

const defaultProps = {
  date: '2025-06-15',
  shiftEvents: [] as CalendarEventDisplay[],
  reminderEvents: [] as CalendarEventDisplay[],
  onCreateEvent: vi.fn(),
  onEditShift: vi.fn(),
  onEditReminder: vi.fn(),
  onDismiss: vi.fn(),
};

describe('DayActionModal', () => {
  it('should display formatted date header in English locale', () => {
    render(<DayActionModal {...defaultProps} date="2025-06-15" />);

    expect(screen.getByRole('heading')).toHaveTextContent(/june.*15.*2025/i);
  });

  it('should display the create calendar event button', () => {
    render(<DayActionModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /create calendar event/i })).toBeInTheDocument();
  });

  it('should call onCreateEvent when create button is clicked', async () => {
    const user = userEvent.setup();
    const onCreateEvent = vi.fn();

    render(<DayActionModal {...defaultProps} onCreateEvent={onCreateEvent} />);

    await user.click(screen.getByRole('button', { name: /create calendar event/i }));

    expect(onCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('should display shift cards sorted alphabetically by name', () => {
    const shifts = [
      createEvent({ id: 's1', eventType: 'shift', name: 'Zebra Shift', startTime: 480, endTime: 960 }),
      createEvent({ id: 's2', eventType: 'shift', name: 'Alpha Shift', startTime: 0, endTime: 480 }),
      createEvent({ id: 's3', eventType: 'shift', name: 'Middle Shift', startTime: 960, endTime: 1200 }),
    ];

    render(<DayActionModal {...defaultProps} shiftEvents={shifts} />);

    const buttons = screen.getAllByRole('button');
    // First button is "Close", second is "Create calendar event", rest are cards
    const cardTexts = buttons.slice(2).map((b) => b.textContent);

    expect(cardTexts[0]).toContain('Alpha Shift');
    expect(cardTexts[1]).toContain('Middle Shift');
    expect(cardTexts[2]).toContain('Zebra Shift');
  });

  it('should display reminder cards sorted alphabetically by name', () => {
    const reminders = [
      createEvent({ id: 'r1', eventType: 'reminder', name: 'Walk Dog', icon: '🐕' }),
      createEvent({ id: 'r2', eventType: 'reminder', name: 'Drink Water', icon: '💧' }),
    ];

    render(<DayActionModal {...defaultProps} reminderEvents={reminders} />);

    const buttons = screen.getAllByRole('button');
    const cardTexts = buttons.slice(2).map((b) => b.textContent);

    expect(cardTexts[0]).toContain('Drink Water');
    expect(cardTexts[1]).toContain('Walk Dog');
  });

  it('should display shifts before reminders', () => {
    const shifts = [
      createEvent({ id: 's1', eventType: 'shift', name: 'Shift A', startTime: 480, endTime: 960 }),
    ];
    const reminders = [
      createEvent({ id: 'r1', eventType: 'reminder', name: 'Reminder B', icon: '💊' }),
    ];

    render(<DayActionModal {...defaultProps} shiftEvents={shifts} reminderEvents={reminders} />);

    const buttons = screen.getAllByRole('button');
    const cardTexts = buttons.slice(2).map((b) => b.textContent);

    expect(cardTexts[0]).toContain('Shift A');
    expect(cardTexts[1]).toContain('Reminder B');
  });

  it('should call onDismiss when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<DayActionModal {...defaultProps} onDismiss={onDismiss} />);

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when clicking outside the modal', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<DayActionModal {...defaultProps} onDismiss={onDismiss} />);

    // The overlay is the presentation div
    const overlay = screen.getByRole('presentation');
    await user.click(overlay);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should render as an accessible dialog', () => {
    render(<DayActionModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'day-action-modal-title');
  });

  it('should call onEditShift when a shift card is clicked', async () => {
    const user = userEvent.setup();
    const onEditShift = vi.fn();
    const shifts = [
      createEvent({ id: 'shift-99', eventType: 'shift', name: 'Night Shift', startTime: 1320, endTime: 60 }),
    ];

    render(<DayActionModal {...defaultProps} shiftEvents={shifts} onEditShift={onEditShift} />);

    const buttons = screen.getAllByRole('button');
    // buttons[0] = Close, buttons[1] = Create, buttons[2] = shift card
    await user.click(buttons[2]!);

    expect(onEditShift).toHaveBeenCalledWith('shift-99');
  });

  it('should call onEditReminder when a reminder card is clicked', async () => {
    const user = userEvent.setup();
    const onEditReminder = vi.fn();
    const reminders = [
      createEvent({ id: 'rem-55', eventType: 'reminder', name: 'Exercise', icon: '🏋️' }),
    ];

    render(
      <DayActionModal {...defaultProps} reminderEvents={reminders} onEditReminder={onEditReminder} />,
    );

    const buttons = screen.getAllByRole('button');
    // buttons[0] = Close, buttons[1] = Create, buttons[2] = reminder card
    await user.click(buttons[2]!);

    expect(onEditReminder).toHaveBeenCalledWith('rem-55');
  });
});
