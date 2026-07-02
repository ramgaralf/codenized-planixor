/**
 * Pure utility functions for calendar event display formatting.
 */

/**
 * Formats the duration between two times (minutes from midnight) as a human-readable string.
 * Returns "Xh Ym" format. If hours is 0, shows only minutes ("30m").
 * If minutes is 0, shows only hours ("2h").
 *
 * @param startTime - Minutes from midnight (0-1439)
 * @param endTime - Minutes from midnight (0-1439), must be > startTime
 * @returns Duration string in "Xh Ym" format
 *
 * @example formatDuration(480, 570) → "1h 30m"
 * @example formatDuration(480, 600) → "2h"
 * @example formatDuration(480, 510) → "30m"
 */
export const formatDuration = (startTime: number, endTime: number): string => {
  const totalMinutes = endTime - startTime;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

/**
 * Converts minutes from midnight to "HH:mm" format.
 *
 * @param minutes - Minutes from midnight (0-1439)
 * @returns Time string in "HH:mm" format
 *
 * @example formatTimeFromMinutes(480) → "08:00"
 * @example formatTimeFromMinutes(0) → "00:00"
 * @example formatTimeFromMinutes(1439) → "23:59"
 */
export const formatTimeFromMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Returns the date range for Day view mode.
 * Both start and end are the same date.
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Object with start and end as the same ISO date string
 */
export const getDateRangeForDay = (date: string): { start: string; end: string } => {
  return { start: date, end: date };
};

/**
 * Returns the date range for Week view mode (Monday to Sunday, ISO week).
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Object with start (Monday) and end (Sunday) as ISO date strings
 */
export const getDateRangeForWeek = (date: string): { start: string; end: string } => {
  const parts = date.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const d = new Date(year, month - 1, day);

  // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  // Convert to Monday-based: Monday=0, Tuesday=1, ..., Sunday=6
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(year, month - 1, day + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  return {
    start: formatISODate(monday),
    end: formatISODate(sunday),
  };
};

/**
 * Returns the date range for Month view mode.
 * First day to last day of the month containing the given date.
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Object with start (first day) and end (last day) as ISO date strings
 */
export const getDateRangeForMonth = (date: string): { start: string; end: string } => {
  const parts = date.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  const firstDay = new Date(year, month - 1, 1);
  // Day 0 of next month = last day of current month
  const lastDay = new Date(year, month, 0);

  return {
    start: formatISODate(firstDay),
    end: formatISODate(lastDay),
  };
};

/**
 * Returns the date range for Year view mode.
 * January 1 to December 31 of the year containing the given date.
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Object with start (Jan 1) and end (Dec 31) as ISO date strings
 */
export const getDateRangeForYear = (date: string): { start: string; end: string } => {
  const parts = date.split('-');
  const year = parseInt(parts[0] ?? '0', 10);

  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
};

/**
 * Formats a Date object as an ISO date string (YYYY-MM-DD).
 * Uses local date parts to avoid timezone issues.
 */
const formatISODate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the effective start/end minutes for an event on a given day.
 * Multi-day events span 00:00–23:59 on intermediate days.
 *
 * Used by DayView to compute event block position and height.
 */
export const getEffectiveTimes = (
  event: { eventType: string; startDay: string; endDay: string; startTime: number; endTime: number },
  currentDayStr: string,
): { effectiveStart: number; effectiveEnd: number } => {
  const isMultiDay = event.startDay !== event.endDay;
  if (!isMultiDay) {
    return { effectiveStart: event.startTime, effectiveEnd: event.endTime };
  }

  const isStartDay = event.startDay === currentDayStr;
  const isEndDay = event.endDay === currentDayStr;

  // If the event ends at 00:00 on this day, it doesn't occupy any time here
  if (isEndDay && event.endTime === 0) {
    return { effectiveStart: 0, effectiveEnd: 0 };
  }

  return {
    effectiveStart: isStartDay ? event.startTime : 0,
    effectiveEnd: isEndDay ? event.endTime : 1439,
  };
};
