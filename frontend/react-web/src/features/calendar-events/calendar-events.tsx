import { useCallback, useState } from 'react';

import { useCalendarStore } from '@/stores/calendarStore';

import { ConfirmationModal } from './components/ConfirmationModal';
import { DayDateNavigator } from './components/DayDateNavigator';
import { DayView } from './components/DayView';
import { EventDetailPage } from './components/EventDetailPage';
import { EventForm } from './components/EventForm';
import { MonthDateNavigator } from './components/MonthDateNavigator';
import { MonthView } from './components/MonthView';
import { ViewSelector } from './components/ViewSelector';
import { WeekDateNavigator } from './components/WeekDateNavigator';
import { WeekView } from './components/WeekView';
import { YearView } from './components/YearView';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useEventFiltering } from './hooks/useEventFiltering';
import type { CalendarEventDisplay } from './models';

/**
 * Internal view state for the calendar-events container.
 * Controls which "page" is currently displayed.
 */
type ViewState =
  | { mode: 'calendar' }
  | { mode: 'create' }
  | { mode: 'detail'; event: CalendarEventDisplay };

interface CalendarEventsProps {
  /** When true, switches to create mode (controlled by parent page / top bar) */
  showCreateForm?: boolean;
  /** Callback to notify parent that create mode was exited */
  onCreateFormClose?: () => void;
}

/**
 * CalendarEvents — container component for the calendar events feature.
 *
 * Orchestrates the calendar page: view mode selection, date navigation,
 * event display, and event CRUD operations.
 *
 * Responsibilities:
 * 1. Manages which "page" is shown: calendar view, event form (create), or event detail (edit)
 * 2. Renders ViewSelector + the active view component (Day/Week/Month/Year)
 * 3. Handles navigation between views: calendar → create form, calendar → event detail, back to calendar
 * 4. Uses calendarStore for view mode and current date
 * 5. Uses calendarEventService (via useCalendarEvents hook) for data
 *
 * **Validates: Requirements 3.4, 4.4, 5.4, 6.4, 12.2, 12.5**
 */
export const CalendarEvents = ({ showCreateForm, onCreateFormClose }: CalendarEventsProps) => {
  const [viewState, setViewState] = useState<ViewState>({ mode: 'calendar' });
  const [deleteTarget, setDeleteTarget] = useState<CalendarEventDisplay | null>(null);

  const activeView = useCalendarStore((state) => state.activeView);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setView = useCalendarStore((state) => state.setView);

  const { events } = useCalendarEvents();
  const { filteredEvents } = useEventFiltering(events);

  // Handle parent-controlled create mode via prop
  const effectiveMode = showCreateForm && viewState.mode === 'calendar' ? 'create' : viewState.mode;

  const backToCalendar = useCallback(() => {
    setViewState({ mode: 'calendar' });
    onCreateFormClose?.();
  }, [onCreateFormClose]);

  const handleEventClick = useCallback((event: CalendarEventDisplay) => {
    setViewState({ mode: 'detail', event });
  }, []);

  const handleMonthDayClick = useCallback(
    (day: string) => {
      // Navigate to day view for the selected date
      const [year, month, dayNum] = day.split('-').map(Number);
      const targetDate = new Date(year, month - 1, dayNum);
      useCalendarStore.setState({ currentDate: targetDate });
      setView('day');
    },
    [setView],
  );

  const handleYearDayClick = useCallback(
    (day: string) => {
      // Navigate to day view for the clicked date
      const [year, month, dayNum] = day.split('-').map(Number);
      const targetDate = new Date(year, month - 1, dayNum);
      useCalendarStore.setState({ currentDate: targetDate });
      setView('day');
    },
    [setView],
  );

  const handleDeleteConfirm = useCallback(() => {
    setDeleteTarget(null);
    backToCalendar();
  }, [backToCalendar]);

  const handleDeleteDismiss = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleDeleteFromDetail = useCallback(() => {
    if (viewState.mode === 'detail') {
      setDeleteTarget(viewState.event);
    }
  }, [viewState]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {effectiveMode === 'calendar' && (
        <>
          <div
            className="shrink-0"
            style={{ padding: '8px 16px' }}
          >
            {/* Mobile: stack vertically; Desktop: same row */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <ViewSelector />
              {activeView === 'day' && (
                <div
                  className="day-date-nav-wrapper justify-center md:justify-end"
                  style={{ flexGrow: 1, display: 'flex' }}
                >
                  <DayDateNavigator />
                </div>
              )}
              {activeView === 'week' && (
                <div
                  className="week-date-nav-wrapper justify-center md:justify-end"
                  style={{ flexGrow: 1, display: 'flex' }}
                >
                  <WeekDateNavigator />
                </div>
              )}
              {activeView === 'month' && (
                <div
                  className="month-date-nav-wrapper justify-center md:justify-end"
                  style={{ flexGrow: 1, display: 'flex' }}
                >
                  <MonthDateNavigator />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeView === 'day' && (
              <DayView
                events={filteredEvents}
                currentDate={currentDate}
                onEventClick={handleEventClick}
              />
            )}
            {activeView === 'week' && (
              <WeekView
                events={filteredEvents}
                currentDate={currentDate}
                onEventClick={handleEventClick}
              />
            )}
            {activeView === 'month' && (
              <MonthView
                events={filteredEvents}
                currentDate={currentDate}
                onDayClick={handleMonthDayClick}
              />
            )}
            {activeView === 'year' && (
              <YearView
                events={filteredEvents}
                currentDate={currentDate}
                onDayClick={handleYearDayClick}
              />
            )}
          </div>
        </>
      )}

      {effectiveMode === 'create' && (
        <EventForm onSuccess={backToCalendar} onCancel={backToCalendar} />
      )}

      {effectiveMode === 'detail' && viewState.mode === 'detail' && (
        <EventDetailPage
          event={viewState.event}
          onBack={backToCalendar}
          onDelete={handleDeleteFromDetail}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          isOpen={true}
          eventName={deleteTarget.name}
          eventId={deleteTarget.id}
          onConfirm={handleDeleteConfirm}
          onDismiss={handleDeleteDismiss}
        />
      )}
    </div>
  );
};
