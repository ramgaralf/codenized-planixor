import { useMemo } from 'react';

import { useCalendarStore } from '@/stores/calendarStore';

import type { CalendarEventDisplay } from '../models';
import {
  getDateRangeForDay,
  getDateRangeForWeek,
  getDateRangeForMonth,
  getDateRangeForYear,
} from '../utils';

interface UseEventFilteringReturn {
  /** Filtered events for the current view */
  filteredEvents: CalendarEventDisplay[];
  /** Start of the current date range (YYYY-MM-DD) */
  startDate: string;
  /** End of the current date range (YYYY-MM-DD) */
  endDate: string;
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
  date: string
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
 * Hook that filters calendar events based on the active view mode and current date from the calendar store.
 * Filters out deleted events and events outside the current date range.
 * Memoizes the result to avoid unnecessary re-renders.
 *
 * @param events - The full list of CalendarEventDisplay items to filter
 * @returns Filtered events and the computed date range
 */
export const useEventFiltering = (events: CalendarEventDisplay[]): UseEventFilteringReturn => {
  const activeView = useCalendarStore((state) => state.activeView);
  const currentDate = useCalendarStore((state) => state.currentDate);

  const dateString = useMemo(() => toISODateString(currentDate), [currentDate]);

  const { start: startDate, end: endDate } = useMemo(
    () => getDateRangeForView(activeView, dateString),
    [activeView, dateString]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !event.isDeleted && event.startDay <= endDate && event.endDay >= startDate
      ),
    [events, startDate, endDate]
  );

  return { filteredEvents, startDate, endDate };
};
