import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { useCalendarStore } from '@/stores/calendarStore';

import type { CalendarEvent, CalendarEventDisplay } from '../models';
import type { CreateCalendarEventInput } from '../services/calendarEventService';
import * as calendarEventService from '../services/calendarEventService';
import {
  getDateRangeForDay,
  getDateRangeForWeek,
  getDateRangeForMonth,
  getDateRangeForYear,
} from '../utils';

export interface UseCalendarEventsReturn {
  events: CalendarEventDisplay[];
  isLoading: boolean;
  error: string | null;
  createEvent: (input: CreateCalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, changes: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByDate: (day: string) => Promise<CalendarEventDisplay[]>;
}

/**
 * Formats a Date object as an ISO date string (YYYY-MM-DD) using local date parts.
 */
const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Computes the date range for the given view mode and reference date.
 */
const getDateRangeForView = (
  view: 'day' | 'week' | 'month' | 'year',
  date: string,
): { start: string; end: string } => {
  switch (view) {
    case 'day':
      return getDateRangeForDay(date);
    case 'week':
      return getDateRangeForWeek(date);
    case 'month':
      return getDateRangeForMonth(date);
    case 'year':
      return getDateRangeForYear(date);
  }
};

/**
 * Hook that provides reactive calendar event data and CRUD operations
 * for the current view's date range.
 *
 * Uses `useLiveQuery` from Dexie to reactively query events whenever
 * the underlying IndexedDB data changes, the active view mode changes,
 * or the navigated date changes.
 *
 * Wraps `calendarEventService` CRUD operations with error state management.
 *
 * **Validates: Requirements 1.1, 7.2, 8.2**
 */
export const useCalendarEvents = (): UseCalendarEventsReturn => {
  const [error, setError] = useState<string | null>(null);

  const activeView = useCalendarStore((state) => state.activeView);
  const currentDate = useCalendarStore((state) => state.currentDate);

  const dateString = useMemo(() => toISODateString(currentDate), [currentDate]);

  const { start: startDate, end: endDate } = useMemo(
    () => getDateRangeForView(activeView, dateString),
    [activeView, dateString],
  );

  const queryResult = useLiveQuery(
    () => calendarEventService.getByDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const events = queryResult ?? [];
  const isLoading = queryResult === undefined;

  const createEvent = useCallback(
    async (input: CreateCalendarEventInput): Promise<CalendarEvent> => {
      try {
        setError(null);
        const event = await calendarEventService.create(input);
        return event;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create event';
        console.error('Failed to create calendar event:', err);
        setError(message);
        throw err;
      }
    },
    [],
  );

  const updateEvent = useCallback(
    async (id: string, changes: Partial<CalendarEvent>): Promise<CalendarEvent> => {
      try {
        setError(null);
        const event = await calendarEventService.update(id, changes);
        return event;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update event';
        console.error('Failed to update calendar event:', err);
        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await calendarEventService.softDelete(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      console.error('Failed to delete calendar event:', err);
      setError(message);
      throw err;
    }
  }, []);

  const getEventsByDate = useCallback(
    async (day: string): Promise<CalendarEventDisplay[]> => {
      try {
        setError(null);
        return await calendarEventService.getByDate(day);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch events';
        console.error('Failed to fetch calendar events by date:', err);
        setError(message);
        throw err;
      }
    },
    [],
  );

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
  };
};
