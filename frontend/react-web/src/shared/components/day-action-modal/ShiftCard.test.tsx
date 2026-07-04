import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CalendarEventDisplay } from '@features/calendar-events/models';

import { ShiftCard } from './ShiftCard';

const createShiftEvent = (overrides: Partial<CalendarEventDisplay> = {}): CalendarEventDisplay => ({
  id: 'shift-event-1',
  eventType: 'shift',
  eventTypeId: 'shift-def-1',
  name: 'Morning Shift',
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

describe('ShiftCard', () => {
  it('should display shift name when shift event is provided', () => {
    render(<ShiftCard event={createShiftEvent()} onEditShift={vi.fn()} />);

    expect(screen.getByText('Morning Shift')).toBeInTheDocument();
  });

  it('should display the emoji icon', () => {
    render(<ShiftCard event={createShiftEvent({ icon: '☀️' })} onEditShift={vi.fn()} />);

    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('should display start time and end time in HH:mm format on line 2', () => {
    render(
      <ShiftCard
        event={createShiftEvent({ startTime: 480, endTime: 960 })}
        onEditShift={vi.fn()}
      />,
    );

    expect(screen.getByText('08:00 – 16:00')).toBeInTheDocument();
  });

  it('should display zero-padded times for early hours', () => {
    render(
      <ShiftCard
        event={createShiftEvent({ startTime: 65, endTime: 125 })}
        onEditShift={vi.fn()}
      />,
    );

    expect(screen.getByText('01:05 – 02:05')).toBeInTheDocument();
  });

  it('should render 4px left border with the shift color', () => {
    render(
      <ShiftCard
        event={createShiftEvent({ backgroundColor: '#EF4444' })}
        onEditShift={vi.fn()}
      />,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveStyle({ borderLeft: '4px solid #EF4444' });
  });

  it('should call onEditShift with event id when clicked', async () => {
    const user = userEvent.setup();
    const onEditShift = vi.fn();

    render(<ShiftCard event={createShiftEvent({ id: 'evt-42' })} onEditShift={onEditShift} />);

    await user.click(screen.getByRole('button'));

    expect(onEditShift).toHaveBeenCalledWith('evt-42');
    expect(onEditShift).toHaveBeenCalledTimes(1);
  });

  it('should call onEditShift when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onEditShift = vi.fn();

    render(<ShiftCard event={createShiftEvent({ id: 'evt-99' })} onEditShift={onEditShift} />);

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(onEditShift).toHaveBeenCalledWith('evt-99');
  });

  it('should truncate long names with ellipsis via CSS', () => {
    const longName = 'A'.repeat(55);
    render(<ShiftCard event={createShiftEvent({ name: longName })} onEditShift={vi.fn()} />);

    const nameElement = screen.getByText(longName);
    expect(nameElement).toHaveStyle({ textOverflow: 'ellipsis', overflow: 'hidden' });
  });
});

describe('ShiftCard — orphaned event', () => {
  it('should render as disabled when event is orphaned', () => {
    render(
      <ShiftCard
        event={createShiftEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditShift={vi.fn()}
      />,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).toHaveStyle({ cursor: 'not-allowed', opacity: '0.5' });
  });

  it('should display [Deleted] text for orphaned events', () => {
    render(
      <ShiftCard
        event={createShiftEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditShift={vi.fn()}
      />,
    );

    expect(screen.getByText('[Deleted]')).toBeInTheDocument();
  });

  it('should not call onEditShift when an orphaned card is clicked', async () => {
    const user = userEvent.setup();
    const onEditShift = vi.fn();

    render(
      <ShiftCard
        event={createShiftEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditShift={onEditShift}
      />,
    );

    const card = screen.getByRole('button');
    await user.click(card);

    expect(onEditShift).not.toHaveBeenCalled();
  });

  it('should not be focusable when orphaned (tabIndex -1)', () => {
    render(
      <ShiftCard
        event={createShiftEvent({ isOrphaned: true, name: '[Deleted]' })}
        onEditShift={vi.fn()}
      />,
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '-1');
  });
});
