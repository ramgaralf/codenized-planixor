import { useCallback, useEffect, useRef, useState } from 'react';

import { useCalendarStore } from '@/stores/calendarStore';
import { useShiftMode } from '@features/shift-mode/hooks/useShiftMode';

import { DayActionModal } from '@shared/components/day-action-modal/DayActionModal';

import { ConfirmationModal } from './components/ConfirmationModal';
import { DayDateNavigator } from './components/DayDateNavigator';
import { DayView } from './components/DayView';
import { EventDetailPage } from './components/EventDetailPage';
import { EventForm } from './components/EventForm';
import { MonthDateNavigator } from './components/MonthDateNavigator';
import { MonthView } from './components/MonthView';
import { PrerequisiteModal } from './components/PrerequisiteModal';
import { SeriesActionDialog } from './components/SeriesActionDialog';
import { ViewSelector } from './components/ViewSelector';
import { WeekDateNavigator } from './components/WeekDateNavigator';
import { WeekView } from './components/WeekView';
import { YearDateNavigator } from './components/YearDateNavigator';
import { YearView } from './components/YearView';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useEventFiltering } from './hooks/useEventFiltering';
import { usePrerequisiteCheck } from './hooks/usePrerequisiteCheck';
import type { CalendarEventDisplay } from './models';
import * as calendarEventService from './services/calendarEventService';
import { getEffectiveTimes } from './utils';

/**
 * Internal view state for the calendar-events container.
 * Controls which "page" is currently displayed.
 */
type ViewState =
  | { mode: 'calendar' }
  | { mode: 'create'; originView?: 'month' | 'year' }
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
  const [showPrerequisiteModal, setShowPrerequisiteModal] = useState(false);
  /** Series action dialog state for delete flow */
  const [seriesDeleteTarget, setSeriesDeleteTarget] = useState<CalendarEventDisplay | null>(null);
  /** Date for Day_Action_Modal */
  const [dayActionModalDate, setDayActionModalDate] = useState<string | null>(null);
  /** Events for the Day_Action_Modal — split by type */
  const [dayActionModalShifts, setDayActionModalShifts] = useState<CalendarEventDisplay[]>([]);
  const [dayActionModalReminders, setDayActionModalReminders] = useState<CalendarEventDisplay[]>([]);

  const activeView = useCalendarStore((state) => state.activeView);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setView = useCalendarStore((state) => state.setView);

  const { events, getEventsByDate } = useCalendarEvents();
  const { filteredEvents } = useEventFiltering(events);
  const { enabled: shiftModeEnabled } = useShiftMode();
  const { result: prerequisiteResult } = usePrerequisiteCheck();

  // Track previous shift mode state to detect activation/deactivation transitions
  const prevShiftModeEnabled = useRef(shiftModeEnabled);

  // When shift mode is activated, navigate away from unsupported views (Day/Week)
  // preserving date context. Default to Month view when shift mode is active.
  // When shift mode is deactivated, restore Day view as the default (Req 4.6).
  useEffect(() => {
    const wasEnabled = prevShiftModeEnabled.current;
    prevShiftModeEnabled.current = shiftModeEnabled;

    if (shiftModeEnabled && (activeView === 'day' || activeView === 'week')) {
      setView('month');
    } else if (wasEnabled && !shiftModeEnabled) {
      // Shift mode just deactivated — restore Day view as default
      setView('day');
    }
  }, [shiftModeEnabled, activeView, setView]);

  // Detect midnight crossing and advance calendar to new day
  const lastKnownDay = useRef(new Date().toDateString());
  useEffect(() => {
    const interval = setInterval(() => {
      const todayStr = new Date().toDateString();
      if (todayStr !== lastKnownDay.current) {
        const previousToday = lastKnownDay.current;
        lastKnownDay.current = todayStr;
        // If user was viewing the previous "today", advance to new today
        if (currentDate.toDateString() === previousToday) {
          useCalendarStore.setState({ currentDate: new Date() });
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentDate]);

  // Handle parent-controlled create mode via prop
  const effectiveMode = showCreateForm && viewState.mode === 'calendar' ? 'create' : viewState.mode;

  const backToCalendar = useCallback(() => {
    // If creating from Year view in shift mode, return to Year view (Req 7.3, 7.4)
    if (viewState.mode === 'create' && viewState.originView === 'year') {
      setView('year');
    }
    setViewState({ mode: 'calendar' });
    onCreateFormClose?.();
  }, [onCreateFormClose, viewState, setView]);

  const handleEventClick = useCallback((event: CalendarEventDisplay) => {
    setViewState({ mode: 'detail', event });
  }, []);

  const handleMonthDayClick = useCallback(
    async (day: string) => {
      if (shiftModeEnabled) {
        // Shift mode day-tap logic for Month view (Req 5.1, 5.2, 5.5)
        const dayEvents = await getEventsByDate(day);
        const shiftOrReminderEvents = dayEvents.filter((e) => {
          if (e.isDeleted) return false;
          if (e.eventType !== 'shift' && e.eventType !== 'reminder') return false;
          const { effectiveStart, effectiveEnd } = getEffectiveTimes(e, day);
          return effectiveEnd > effectiveStart;
        });

        if (shiftOrReminderEvents.length === 0) {
          // Empty day — prerequisite check
          if (prerequisiteResult.canCreate) {
            // Open Calendar_Event_Form with date preselected
            const parts = day.split('-');
            const year = Number(parts[0]);
            const month = Number(parts[1]);
            const dayNum = Number(parts[2]);
            useCalendarStore.setState({ currentDate: new Date(year, month - 1, dayNum) });
            setViewState({ mode: 'create', originView: 'month' });
          } else {
            // Show Prerequisite_Modal
            setShowPrerequisiteModal(true);
          }
        } else {
          // Day with content — show Day_Action_Modal
          setDayActionModalDate(day);
          setDayActionModalShifts(shiftOrReminderEvents.filter((e) => e.eventType === 'shift'));
          setDayActionModalReminders(shiftOrReminderEvents.filter((e) => e.eventType === 'reminder'));
        }
        return;
      }

      // Default behavior: navigate to day view for the selected date
      const parts = day.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const dayNum = Number(parts[2]);
      const targetDate = new Date(year, month - 1, dayNum);
      useCalendarStore.setState({ currentDate: targetDate });
      setView('day');
    },
    [setView, shiftModeEnabled, getEventsByDate, prerequisiteResult],
  );

  const handleYearDayClick = useCallback(
    async (day: string) => {
      if (shiftModeEnabled) {
        // Shift mode day-tap logic for Year view (Req 7.1, 7.2)
        const dayEvents = await getEventsByDate(day);
        const shiftOrReminderEvents = dayEvents.filter((e) => {
          if (e.isDeleted) return false;
          if (e.eventType !== 'shift' && e.eventType !== 'reminder') return false;
          const { effectiveStart, effectiveEnd } = getEffectiveTimes(e, day);
          return effectiveEnd > effectiveStart;
        });

        if (shiftOrReminderEvents.length === 0) {
          // Empty day — prerequisite check
          if (prerequisiteResult.canCreate) {
            // Open Calendar_Event_Form with date preselected, return to Year view on close
            const parts = day.split('-');
            const year = Number(parts[0]);
            const month = Number(parts[1]);
            const dayNum = Number(parts[2]);
            useCalendarStore.setState({ currentDate: new Date(year, month - 1, dayNum) });
            setViewState({ mode: 'create', originView: 'year' });
          } else {
            // Show Prerequisite_Modal
            setShowPrerequisiteModal(true);
          }
        } else {
          // Day with content — show Day_Action_Modal
          setDayActionModalDate(day);
          setDayActionModalShifts(shiftOrReminderEvents.filter((e) => e.eventType === 'shift'));
          setDayActionModalReminders(shiftOrReminderEvents.filter((e) => e.eventType === 'reminder'));
        }
        return;
      }

      // Default behavior: navigate to day view for the clicked date
      const parts = day.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const dayNum = Number(parts[2]);
      const targetDate = new Date(year, month - 1, dayNum);
      useCalendarStore.setState({ currentDate: targetDate });
      setView('day');
    },
    [setView, shiftModeEnabled, getEventsByDate, prerequisiteResult],
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
      if (viewState.event.seriesId) {
        // Series event → show SeriesActionDialog first
        setSeriesDeleteTarget(viewState.event);
      } else {
        // Non-series event → go directly to ConfirmationModal
        setDeleteTarget(viewState.event);
      }
    }
  }, [viewState]);

  const handleSeriesDeleteThisEvent = useCallback(() => {
    if (seriesDeleteTarget) {
      setDeleteTarget(seriesDeleteTarget);
      setSeriesDeleteTarget(null);
    }
  }, [seriesDeleteTarget]);

  const handleSeriesDeleteAllInSeries = useCallback(async () => {
    if (seriesDeleteTarget) {
      try {
        await calendarEventService.softDeleteSeries(seriesDeleteTarget.id);
        setSeriesDeleteTarget(null);
        backToCalendar();
      } catch (err) {
        console.error('Failed to delete series events:', err);
        setSeriesDeleteTarget(null);
      }
    }
  }, [seriesDeleteTarget, backToCalendar]);

  const handleSeriesDeleteCancel = useCallback(() => {
    setSeriesDeleteTarget(null);
  }, []);

  const handlePrerequisiteModalDismiss = useCallback(() => {
    setShowPrerequisiteModal(false);
  }, []);

  const handleDayActionModalDismiss = useCallback(() => {
    setDayActionModalDate(null);
    setDayActionModalShifts([]);
    setDayActionModalReminders([]);
  }, []);

  const handleDayActionModalCreateEvent = useCallback(() => {
    if (!dayActionModalDate) return;
    // Close modal and open Calendar_Event_Form with date preselected
    // Per Req 6.4 (Month) and 8.4 (Year): always return to Month view on form close
    const parts = dayActionModalDate.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const dayNum = Number(parts[2]);
    useCalendarStore.setState({ currentDate: new Date(year, month - 1, dayNum) });
    // Navigate to Month view if currently on Year view (per Req 8.4)
    if (activeView === 'year') {
      setView('month');
    }
    setDayActionModalDate(null);
    setDayActionModalShifts([]);
    setDayActionModalReminders([]);
    setViewState({ mode: 'create', originView: 'month' });
  }, [dayActionModalDate, activeView, setView]);

  const handleDayActionModalEditShift = useCallback(
    (eventId: string) => {
      // Close modal and open edit form for the shift event
      // Per Req 8.5/8.6: from Year view Day_Action_Modal, navigate to Month view
      const event = dayActionModalShifts.find((e) => e.id === eventId);
      if (activeView === 'year') {
        setView('month');
      }
      setDayActionModalDate(null);
      setDayActionModalShifts([]);
      setDayActionModalReminders([]);
      if (event) {
        setViewState({ mode: 'detail', event });
      }
    },
    [dayActionModalShifts, activeView, setView],
  );

  const handleDayActionModalEditReminder = useCallback(
    (eventId: string) => {
      // Close modal and open edit form for the reminder event
      // Per Req 8.7/8.8: from Year view Day_Action_Modal, navigate to Month view
      const event = dayActionModalReminders.find((e) => e.id === eventId);
      if (activeView === 'year') {
        setView('month');
      }
      setDayActionModalDate(null);
      setDayActionModalShifts([]);
      setDayActionModalReminders([]);
      if (event) {
        setViewState({ mode: 'detail', event });
      }
    },
    [dayActionModalReminders, activeView, setView],
  );

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
              {activeView === 'year' && (
                <div
                  className="year-date-nav-wrapper justify-center md:justify-end"
                  style={{ flexGrow: 1, display: 'flex' }}
                >
                  <YearDateNavigator />
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
        <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px' }}>
          <EventForm onSuccess={backToCalendar} onCancel={backToCalendar} />
        </div>
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

      {seriesDeleteTarget && (
        <SeriesActionDialog
          isOpen={true}
          action="delete"
          onThisEvent={handleSeriesDeleteThisEvent}
          onAllInSeries={handleSeriesDeleteAllInSeries}
          onCancel={handleSeriesDeleteCancel}
        />
      )}

      {showPrerequisiteModal && !prerequisiteResult.canCreate && (
        <PrerequisiteModal
          missingShifts={prerequisiteResult.missingShifts}
          missingReminders={prerequisiteResult.missingReminders}
          onDismiss={handlePrerequisiteModalDismiss}
        />
      )}

      {/* Day_Action_Modal — shown when a day with shifts/reminders is tapped in shift mode */}
      {dayActionModalDate && (
        <DayActionModal
          date={dayActionModalDate}
          shiftEvents={dayActionModalShifts}
          reminderEvents={dayActionModalReminders}
          onCreateEvent={handleDayActionModalCreateEvent}
          onEditShift={handleDayActionModalEditShift}
          onEditReminder={handleDayActionModalEditReminder}
          onDismiss={handleDayActionModalDismiss}
        />
      )}
    </div>
  );
};
