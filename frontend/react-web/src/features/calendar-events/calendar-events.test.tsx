import 'fake-indexeddb/auto';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { db } from '@/data/db';
import { useCalendarStore } from '@/stores/calendarStore';

import { CalendarEvents } from './calendar-events';
import type { CalendarEvent } from './models';

// --- Mocks ---

// Mock react-i18next with passthrough t(key)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return Object.entries(params).reduce(
          (result, [k, v]) => result.replace(`{{${k}}}`, v),
          key,
        );
      }
      return key;
    },
    i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
  }),
}));

// Mock lucide-react icons used in EventDetailPage and EventTypeSelector
vi.mock('lucide-react', () => ({
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  ChevronLeft: (props: Record<string, unknown>) => <svg data-testid="chevron-left" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down" {...props} />,
}));

// Mock view components with simple stubs that expose the events they receive
vi.mock('./components/DayView', () => ({
  DayView: ({ events, onEventClick }: { events: Array<{ id: string; name: string }>; onEventClick: (e: unknown) => void }) => (
    <div data-testid="day-view">
      {events.map((e) => (
        <button key={e.id} data-testid={`event-${e.id}`} onClick={() => onEventClick(e)}>
          {e.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./components/WeekView', () => ({
  WeekView: ({ events, onEventClick }: { events: Array<{ id: string; name: string }>; onEventClick: (e: unknown) => void }) => (
    <div data-testid="week-view">
      {events.map((e) => (
        <button key={e.id} data-testid={`event-${e.id}`} onClick={() => onEventClick(e)}>
          {e.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./components/MonthView', () => ({
  MonthView: ({ onDayClick }: { events: unknown[]; onDayClick: (day: string) => void }) => (
    <div data-testid="month-view">
      <button data-testid="month-day-click" onClick={() => onDayClick('2024-06-15')}>
        June 15
      </button>
    </div>
  ),
}));

vi.mock('./components/YearView', () => ({
  YearView: ({ onDayClick }: { events: unknown[]; onDayClick: (day: string) => void }) => (
    <div data-testid="year-view">
      <button data-testid="year-day-click" onClick={() => onDayClick('2024-03-10')}>
        March 10
      </button>
    </div>
  ),
}));

vi.mock('./components/ViewSelector', () => ({
  ViewSelector: () => <div data-testid="view-selector">ViewSelector</div>,
}));

// --- Test Helpers ---

const TEST_DATE = new Date(2024, 5, 15); // June 15, 2024

const createTestReminder = (overrides?: Partial<{ id: string; name: string; icon: string; backgroundColor: string; isActive: boolean; isDeleted: boolean }>) => ({
  id: crypto.randomUUID(),
  name: 'Take Medicine',
  icon: '💊',
  backgroundColor: '#2563EB',
  isActive: true,
  isDeleted: false,
  createdAt: new Date(),
  modifiedAt: new Date(),
  syncedAt: null,
  ...overrides,
});

const createTestEvent = (overrides?: Partial<CalendarEvent>): CalendarEvent => ({
  id: crypto.randomUUID(),
  eventType: 'reminder',
  eventTypeId: 'reminder-1',
  startDay: '2024-06-15',
  endDay: '2024-06-15',
  startTime: 480,
  endTime: 540,
  totalHours: 60,
  notes: null,
  alertOffsets: [],
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('CalendarEvents Container Integration', () => {
  beforeEach(async () => {
    // Reset the calendar store to defaults
    useCalendarStore.setState({
      activeView: 'day',
      currentDate: TEST_DATE,
    });

    // Clear all DB tables
    await db.calendarEvents.clear();
    await db.shifts.clear();
    await db.reminders.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('View switching and navigation', () => {
    it('should render day view by default when activeView is day', () => {
      render(<CalendarEvents />);

      expect(screen.getByTestId('day-view')).toBeInTheDocument();
      expect(screen.getByTestId('view-selector')).toBeInTheDocument();
    });

    it('should render week view when activeView is week', () => {
      useCalendarStore.setState({ activeView: 'week' });
      render(<CalendarEvents />);

      expect(screen.getByTestId('week-view')).toBeInTheDocument();
    });

    it('should render month view when activeView is month', () => {
      useCalendarStore.setState({ activeView: 'month' });
      render(<CalendarEvents />);

      expect(screen.getByTestId('month-view')).toBeInTheDocument();
    });

    it('should render year view when activeView is year', () => {
      useCalendarStore.setState({ activeView: 'year' });
      render(<CalendarEvents />);

      expect(screen.getByTestId('year-view')).toBeInTheDocument();
    });

    it('should switch to day view when activeView changes from week to day', async () => {
      useCalendarStore.setState({ activeView: 'week' });
      render(<CalendarEvents />);

      expect(screen.getByTestId('week-view')).toBeInTheDocument();

      act(() => {
        useCalendarStore.setState({ activeView: 'day' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });
    });

    it('should preserve state when navigating between views', async () => {
      // Seed an event for the test day
      const reminder = createTestReminder({ id: 'rem-1' });
      await db.reminders.add(reminder);
      await db.calendarEvents.add(
        createTestEvent({ eventTypeId: reminder.id }),
      );

      useCalendarStore.setState({ activeView: 'day' });
      const { rerender } = render(<CalendarEvents />);

      // Switch to week view and back
      act(() => {
        useCalendarStore.setState({ activeView: 'week' });
      });
      rerender(<CalendarEvents />);

      act(() => {
        useCalendarStore.setState({ activeView: 'day' });
      });
      rerender(<CalendarEvents />);

      // The container should still render the day view
      expect(screen.getByTestId('day-view')).toBeInTheDocument();
    });
  });

  describe('Create flow', () => {
    it('should show create form when showCreateForm prop is true', () => {
      render(<CalendarEvents showCreateForm={true} />);

      // The form should be visible (EventForm renders form controls)
      expect(screen.queryByTestId('day-view')).not.toBeInTheDocument();
      // EventForm renders labels like "calendarEvent.form.startDay"
      expect(screen.getByLabelText('calendarEvent.form.startDay')).toBeInTheDocument();
    });

    it('should return to calendar view when create form is cancelled', async () => {
      const user = userEvent.setup();
      const onCreateFormClose = vi.fn();

      render(
        <CalendarEvents showCreateForm={true} onCreateFormClose={onCreateFormClose} />,
      );

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: 'common.cancel' });
      await user.click(cancelButton);

      // Should call onCreateFormClose
      expect(onCreateFormClose).toHaveBeenCalledTimes(1);
    });

    it('should create event end-to-end: fill form → submit → event appears in view', async () => {
      const user = userEvent.setup();
      const onCreateFormClose = vi.fn();

      // Seed a reminder so the EventTypeSelector has options
      const reminder = createTestReminder({ id: 'rem-for-create' });
      await db.reminders.add(reminder);

      render(
        <CalendarEvents showCreateForm={true} onCreateFormClose={onCreateFormClose} />,
      );

      // Wait for the useLiveQuery in EventTypeSelector to populate options
      // Open the custom dropdown and select the reminder option
      const selectorButton = screen.getByRole('button', { name: 'calendarEvent.eventTypeSelector.label' });
      await waitFor(() => {
        expect(selectorButton).toBeInTheDocument();
      });
      await user.click(selectorButton);

      // Wait for dropdown options to appear and click the reminder
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      const reminderOption = screen.getByRole('option', { name: new RegExp(reminder.name) });
      await user.click(reminderOption);

      // Fill in startDay using fireEvent for reliable value setting on date inputs
      const startDayInput = screen.getByLabelText('calendarEvent.form.startDay');
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(startDayInput, '2024-06-15');
        startDayInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Fill in start time
      const startTimeInput = screen.getByLabelText('calendarEvent.form.startTime');
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(startTimeInput, '09:00');
        startTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Fill in end time
      const endTimeInput = screen.getByLabelText('calendarEvent.form.endTime');
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(endTimeInput, '10:00');
        endTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Submit the form
      const saveButton = screen.getByRole('button', { name: 'common.save' });
      await user.click(saveButton);

      // Should close the create form
      await waitFor(() => {
        expect(onCreateFormClose).toHaveBeenCalled();
      });

      // Verify the event was persisted in the database
      const events = await db.calendarEvents.toArray();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('reminder');
      expect(events[0].eventTypeId).toBe(reminder.id);
      expect(events[0].startDay).toBe('2024-06-15');
      expect(events[0].startTime).toBe(540); // 9:00 = 9*60
      expect(events[0].endTime).toBe(600); // 10:00 = 10*60
      expect(events[0].isDeleted).toBe(false);
    });
  });

  describe('Edit flow', () => {
    it('should navigate to detail view when event is clicked in day view', async () => {
      const user = userEvent.setup();

      // Seed data
      const reminder = createTestReminder({ id: 'rem-edit' });
      await db.reminders.add(reminder);
      const event = createTestEvent({
        id: 'event-edit-1',
        eventTypeId: reminder.id,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
      });
      await db.calendarEvents.add(event);

      render(<CalendarEvents />);

      // Wait for events to appear in the mocked DayView
      await waitFor(() => {
        expect(screen.getByTestId('event-event-edit-1')).toBeInTheDocument();
      });

      // Click the event
      await user.click(screen.getByTestId('event-event-edit-1'));

      // The detail page should now be visible (it renders the event form with existing event data)
      await waitFor(() => {
        // EventDetailPage shows a delete button with the event name
        expect(
          screen.getByRole('button', { name: /calendarEvent.detail.delete/i }),
        ).toBeInTheDocument();
      });
    });

    it('should return to calendar view when back is clicked from detail page', async () => {
      const user = userEvent.setup();

      // Seed data
      const reminder = createTestReminder({ id: 'rem-back' });
      await db.reminders.add(reminder);
      const event = createTestEvent({
        id: 'event-back-1',
        eventTypeId: reminder.id,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
      });
      await db.calendarEvents.add(event);

      render(<CalendarEvents />);

      // Navigate to detail
      await waitFor(() => {
        expect(screen.getByTestId('event-event-back-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('event-event-back-1'));

      // Should be in detail mode
      await waitFor(() => {
        expect(screen.queryByTestId('day-view')).not.toBeInTheDocument();
      });

      // Click cancel to go back
      const cancelButton = screen.getByRole('button', { name: 'common.cancel' });
      await user.click(cancelButton);

      // Should return to calendar view
      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });
    });

    it('should update event when form is modified and saved', async () => {
      const user = userEvent.setup();

      // Seed data
      const reminder = createTestReminder({ id: 'rem-update' });
      await db.reminders.add(reminder);
      const event = createTestEvent({
        id: 'event-update-1',
        eventTypeId: reminder.id,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 540,
        notes: null,
      });
      await db.calendarEvents.add(event);

      render(<CalendarEvents />);

      // Navigate to detail
      await waitFor(() => {
        expect(screen.getByTestId('event-event-update-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('event-event-update-1'));

      // Wait for form to render with existing values
      await waitFor(() => {
        expect(screen.getByLabelText('calendarEvent.form.endTime')).toBeInTheDocument();
      });

      // Modify end time using native value setter for reliable time input changes
      const endTimeInput = screen.getByLabelText('calendarEvent.form.endTime');
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(endTimeInput, '11:00');
        endTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Save
      const saveButton = screen.getByRole('button', { name: 'common.save' });
      await user.click(saveButton);

      // Should navigate back to calendar
      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });

      // Verify the event was updated in the database
      const updatedEvent = await db.calendarEvents.get('event-update-1');
      expect(updatedEvent!.endTime).toBe(660); // 11:00 = 11*60
    });
  });

  describe('Delete flow', () => {
    it('should show confirmation modal when delete is triggered from detail page', async () => {
      const user = userEvent.setup();

      // Seed data
      const reminder = createTestReminder({ id: 'rem-del' });
      await db.reminders.add(reminder);
      const event = createTestEvent({
        id: 'event-del-1',
        eventTypeId: reminder.id,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
      });
      await db.calendarEvents.add(event);

      render(<CalendarEvents />);

      // Navigate to detail
      await waitFor(() => {
        expect(screen.getByTestId('event-event-del-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('event-event-del-1'));

      // Wait for detail page
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /calendarEvent.detail.delete/i }),
        ).toBeInTheDocument();
      });

      // Click the delete button
      const deleteButton = screen.getByRole('button', { name: /calendarEvent.detail.delete/i });
      await user.click(deleteButton);

      // Confirmation modal should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should soft-delete event when deletion is confirmed', async () => {
      const user = userEvent.setup();

      // Seed data
      const reminder = createTestReminder({ id: 'rem-confirm-del' });
      await db.reminders.add(reminder);
      const event = createTestEvent({
        id: 'event-confirm-del-1',
        eventTypeId: reminder.id,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
      });
      await db.calendarEvents.add(event);

      render(<CalendarEvents />);

      // Navigate to detail
      await waitFor(() => {
        expect(screen.getByTestId('event-event-confirm-del-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('event-event-confirm-del-1'));

      // Click delete
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /calendarEvent.detail.delete/i }),
        ).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('button', { name: /calendarEvent.detail.delete/i }),
      );

      // Confirm deletion in the modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: 'calendarEvent.delete.confirm',
      });
      await user.click(confirmButton);

      // Should navigate back to calendar and event should be soft-deleted
      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });

      // Verify the event was soft-deleted in the database
      const deletedEvent = await db.calendarEvents.get('event-confirm-del-1');
      expect(deletedEvent!.isDeleted).toBe(true);
    });

    it('should dismiss modal and preserve event when deletion is cancelled', async () => {
      const user = userEvent.setup();

      // Seed data
      const reminder = createTestReminder({ id: 'rem-cancel-del' });
      await db.reminders.add(reminder);
      const event = createTestEvent({
        id: 'event-cancel-del-1',
        eventTypeId: reminder.id,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
      });
      await db.calendarEvents.add(event);

      render(<CalendarEvents />);

      // Navigate to detail
      await waitFor(() => {
        expect(screen.getByTestId('event-event-cancel-del-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('event-event-cancel-del-1'));

      // Click delete button
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /calendarEvent.detail.delete/i }),
        ).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('button', { name: /calendarEvent.detail.delete/i }),
      );

      // Cancel in the modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', {
        name: 'calendarEvent.delete.cancel',
      });
      await user.click(cancelButton);

      // Modal should close but we stay on the detail page
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify the event was NOT deleted
      const preservedEvent = await db.calendarEvents.get('event-cancel-del-1');
      expect(preservedEvent!.isDeleted).toBe(false);
    });
  });
});
