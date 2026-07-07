/**
 * Series Occurrence Builder — constructs complete CalendarEvent records
 * from a source event and a list of generated recurrence dates.
 *
 * This is a pure function (no I/O) that produces independent calendar event
 * records for each series date. Each occurrence copies fields from the source
 * event but gets a new UUID, adjusted startDay/endDay, and fresh timestamps.
 */

import type { CalendarEvent } from '@features/calendar-events/models';

export interface BuildOccurrencesInput {
  /** The original event used as template for generated occurrences */
  sourceEvent: CalendarEvent;
  /** Recurrence dates from the series generator (YYYY-MM-DD strings) */
  dates: string[];
  /** Series identifier shared by all events in the same series */
  seriesId: string;
}

/**
 * Computes the day span (in calendar days) between two YYYY-MM-DD date strings.
 * Returns the number of days from startDay to endDay (0 for same-day events).
 */
const computeDaySpan = (startDay: string, endDay: string): number => {
  const [startYear, startMonth, startDayNum] = startDay.split('-').map(Number);
  const [endYear, endMonth, endDayNum] = endDay.split('-').map(Number);

  const start = new Date(startYear!, startMonth! - 1, startDayNum);
  const end = new Date(endYear!, endMonth! - 1, endDayNum);

  const msPerDay = 86_400_000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
};

/**
 * Adds a number of days to a YYYY-MM-DD date string and returns
 * the resulting date as a YYYY-MM-DD string.
 */
const addDaysToDate = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, day! + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Builds complete CalendarEvent records for each generated series date.
 *
 * For each date in `input.dates`:
 * - Generates a new UUID via `crypto.randomUUID()`
 * - Copies: eventType, eventTypeId, startTime, endTime, totalHours, notes, alertOffsets
 * - Computes: startDay = generated date, endDay = generated date + daySpan of source
 * - Sets: modifiedAt = now, syncedAt = null, isDeleted = false
 *
 * The source event's day span is computed as:
 *   daySpan = endDay - startDay (in calendar days)
 *
 * Each occurrence's endDay is then: generatedDate + daySpan days.
 */
export const buildOccurrences = (input: BuildOccurrencesInput): CalendarEvent[] => {
  const { sourceEvent, dates, seriesId } = input;
  const daySpan = computeDaySpan(sourceEvent.startDay, sourceEvent.endDay);
  const now = new Date();

  return dates.map((generatedDate) => ({
    id: crypto.randomUUID(),
    eventType: sourceEvent.eventType,
    eventTypeId: sourceEvent.eventTypeId,
    startDay: generatedDate,
    endDay: daySpan === 0 ? generatedDate : addDaysToDate(generatedDate, daySpan),
    startTime: sourceEvent.startTime,
    endTime: sourceEvent.endTime,
    totalHours: sourceEvent.totalHours,
    notes: sourceEvent.notes,
    alertOffsets: [...sourceEvent.alertOffsets],
    seriesId,
    modifiedAt: now,
    syncedAt: null,
    isDeleted: false,
  }));
};
