import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CalendarEventDisplay } from '@features/calendar-events/models';

import { ReminderCard } from './ReminderCard';

const createReminderEvent = (
  overrides: Partial<CalendarEventDisplay> = {},
): CalendarEventDisplay => ({
  id: 'reminder-event-1',
  eventType: 'reminder',
  eventTypeId: 'reminder-def-1',
  name: 'Take Medicine',
  icon: '💊',
  backgroundColor: '#7C3AED',
  startDay: '2025-06-15',
  endDay: '2025-06-15',
  startTime: 540,
  endTime: 600,
  totalHours: 60,
  notes: null,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  alertOffsets: [],
  isOrphaned: false,
  ...overrides,
});

describe('ReminderCard', () => {
  it('should display reminder name when reminder event is provided', () => {
    render(<ReminderCard event={createReminderEvent()} onEditReminder={vi.fn()} />);

    expect(screen.getByText('Take Medicine')).toBeInTheDocument();
  });

  it('should display the emoji icon', () => {
    render(<ReminderCard event={createReminderEvent({ icon: '🏃' })} onEditReminder={vi.fn()} />);

    expect(screen.getByText('🏃')).toBeInTheDocument();
  });

  it('should display start time and end time in HH:mm format on line 2', () => {
    render(
      <ReminderCard
        event={createReminderEvent({ startTime: 540, endTime: 600 })}
        onEditReminder={vi.fn()}
      />,
    );

    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
  });

  it('should render 4px left border with the reminder color', () => {
    render(
      <ReminderCard
        event={createReminderEvent({ backgroundColor: '#2563EB' })}
        onEditReminder={vi.fn()}
      />,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveStyle({ borderLeft: '4px solid #2563EB' });
  });

  it('should call onEditReminder with event id when clicked', async () => {
    const user = userEvent.setup();
    const onEditReminder = vi.fn();

    render(
      <ReminderCard event={createReminderEvent({ id: 'rem-7' })} onEditReminder={onEditReminder} />,
    );

    await user.click(screen.getByRole('button'));

    expect(onEditReminder).toHaveBeenCalledWith('rem-7');
    expect(onEditReminder).toHaveBeenCalledTimes(1);
  });

  it('should call onEditReminder when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onEditReminder = vi.fn();

    render(
      <ReminderCard
        event={createReminderEvent({ id: 'rem-42' })}
        onEditReminder={onEditReminder}
      />,
    );

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(onEditReminder).toHaveBeenCalledWith('rem-42');
  });

  it('should truncate long names with ellipsis via CSS', () => {
    const longName = 'B'.repeat(55);
    render(
      <ReminderCard event={createReminderEvent({ name: longName })} onEditReminder={vi.fn()} />,
    );

    const nameElement = screen.getByText(longName);
    expect(nameElement).toHaveStyle({ textOverflow: 'ellipsis', overflow: 'hidden' });
  });
});

describe('ReminderCard — orphaned event', () => {
  it('should render as disabled when event is orphaned', () => {
    render(
      <ReminderCard
        event={createReminderEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditReminder={vi.fn()}
      />,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).toHaveStyle({ cursor: 'not-allowed', opacity: '0.5' });
  });

  it('should display [Deleted] text for orphaned events', () => {
    render(
      <ReminderCard
        event={createReminderEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditReminder={vi.fn()}
      />,
    );

    expect(screen.getByText('[Deleted]')).toBeInTheDocument();
  });

  it('should not call onEditReminder when an orphaned card is clicked', async () => {
    const user = userEvent.setup();
    const onEditReminder = vi.fn();

    render(
      <ReminderCard
        event={createReminderEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditReminder={onEditReminder}
      />,
    );

    const card = screen.getByRole('button');
    await user.click(card);

    expect(onEditReminder).not.toHaveBeenCalled();
  });

  it('should not be focusable when orphaned (tabIndex -1)', () => {
    render(
      <ReminderCard
        event={createReminderEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditReminder={vi.fn()}
      />,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '-1');
  });
});
