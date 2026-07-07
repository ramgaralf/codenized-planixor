import { db } from '@/data/db';

import type { CalendarEvent } from '@features/calendar-events/models';

import { generateSeriesDates } from './seriesGenerator';
import { buildOccurrences } from './seriesOccurrenceBuilder';

/**
 * Series Propagation Service — orchestrates calendar event
 * changes when a reminder's seriesFrequency is modified.
 *
 * Handles three propagation scenarios:
 * - Never → Repeating: generate new occurrences from earliest source event
 * - Repeating → Never: soft-delete events after earliest source
 * - Repeating → Different Repeating: soft-delete then regenerate
 *
 * Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7
 */

/**
 * Checks if series propagation is needed by counting non-deleted
 * calendar events referencing the given reminder in the current year.
 *
 * Returns the count of affected events. If 0, no propagation modal
 * should be shown (the reminder can be saved directly).
 *
 * Validates: Requirements 3.1, 3.7
 */
export const checkSeriesPropagationNeeded = async (reminderId: string): Promise<number> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  return db.calendarEvents
    .where('eventType').equals('reminder')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === reminderId &&
      e.startDay >= startOfYear &&
      e.startDay <= endOfYear
    )
    .count();
};

/**
 * Returns non-deleted calendar events referencing the given reminder
 * in the current year, sorted by startDay ascending.
 */
const getEventsForReminderInCurrentYear = async (reminderId: string): Promise<CalendarEvent[]> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const events = await db.calendarEvents
    .where('eventType').equals('reminder')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === reminderId &&
      e.startDay >= startOfYear &&
      e.startDay <= endOfYear
    )
    .toArray();

  return events.sort((a, b) => a.startDay.localeCompare(b.startDay));
};

/**
 * Propagates a frequency change from "never" to a repeating value.
 *
 * 1. Finds the earliest non-deleted event for this reminder in the current year
 * 2. Generates dates using the new frequency from the earliest event through year end
 * 3. Gets all existing non-deleted events for this reminder in current year
 * 4. Filters generated dates: skips any date that matches an existing event's startDay
 * 5. Builds occurrences from the earliest event for the remaining dates
 * 6. Persists all new occurrences
 *
 * Validates: Requirements 3.4
 */
export const propagateNeverToRepeating = async (
  reminderId: string,
  newFrequency: 'weekly' | 'monthly' | 'yearly',
): Promise<void> => {
  const events = await getEventsForReminderInCurrentYear(reminderId);
  if (events.length === 0) return;

  const sourceEvent = events[0]!;

  // Look up the reminder for seriesEndDate
  const reminder = await db.reminders.get(reminderId);
  const endDate = reminder?.seriesEndDate ?? `${new Date().getFullYear() + 50}-12-31`;

  // Generate dates from source event through end date
  const generatedDates = generateSeriesDates({
    startDay: sourceEvent.startDay,
    frequency: newFrequency,
    endDate,
  });

  // Get existing dates to skip duplicates
  const existingDates = new Set(events.map((e) => e.startDay));

  // Filter out dates that already have events
  const newDates = generatedDates.filter((date) => !existingDates.has(date));

  if (newDates.length === 0) return;

  // Generate seriesId for new occurrences (shared with the source event)
  const seriesId = crypto.randomUUID();

  // Update source event with seriesId if it doesn't have one
  if (!sourceEvent.seriesId) {
    await db.calendarEvents.update(sourceEvent.id, { seriesId });
  }

  // Build occurrences from source event
  const occurrences = buildOccurrences({
    sourceEvent,
    dates: newDates,
    seriesId: sourceEvent.seriesId ?? seriesId,
  });

  // Persist all new occurrences
  await db.calendarEvents.bulkAdd(occurrences);
};

/**
 * Propagates a frequency change from a repeating value to "never".
 *
 * 1. Finds the earliest non-deleted event for this reminder in the current year
 * 2. Soft-deletes all non-deleted events with startDay strictly after the earliest
 *    event's startDay and within the current year
 *
 * Validates: Requirements 3.3
 */
export const propagateRepeatingToNever = async (reminderId: string): Promise<void> => {
  const events = await getEventsForReminderInCurrentYear(reminderId);
  if (events.length === 0) return;

  const sourceEvent = events[0]!;
  const now = new Date();
  const currentYear = now.getFullYear();
  const endOfYear = `${currentYear}-12-31`;

  // Soft-delete all events after the earliest source
  await db.calendarEvents
    .where('eventType').equals('reminder')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === reminderId &&
      e.startDay > sourceEvent.startDay &&
      e.startDay <= endOfYear
    )
    .modify((event) => {
      event.isDeleted = true;
      event.modifiedAt = now;
      event.syncedAt = null;
    });
};

/**
 * Propagates a frequency change from one repeating value to another.
 *
 * 1. Finds the earliest non-deleted event for this reminder in the current year
 * 2. Soft-deletes all non-deleted events with startDay strictly after the earliest
 * 3. Generates new dates using the new frequency from the earliest event through year end
 * 4. Builds occurrences from the earliest event for the generated dates
 * 5. Persists all new occurrences
 *
 * Validates: Requirements 3.5
 */
export const propagateRepeatingToRepeating = async (
  reminderId: string,
  newFrequency: 'weekly' | 'monthly' | 'yearly',
): Promise<void> => {
  const events = await getEventsForReminderInCurrentYear(reminderId);
  if (events.length === 0) return;

  const sourceEvent = events[0]!;
  const now = new Date();
  const currentYear = now.getFullYear();
  const endOfYear = `${currentYear}-12-31`;

  // Step 1: Soft-delete all events after the earliest source
  await db.calendarEvents
    .where('eventType').equals('reminder')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === reminderId &&
      e.startDay > sourceEvent.startDay &&
      e.startDay <= endOfYear
    )
    .modify((event) => {
      event.isDeleted = true;
      event.modifiedAt = now;
      event.syncedAt = null;
    });

  // Step 2: Look up the reminder for seriesEndDate
  const reminder = await db.reminders.get(reminderId);
  const endDate = reminder?.seriesEndDate ?? `${currentYear + 50}-12-31`;

  // Step 3: Generate new dates using the new frequency
  const generatedDates = generateSeriesDates({
    startDay: sourceEvent.startDay,
    frequency: newFrequency,
    endDate,
  });

  if (generatedDates.length === 0) return;

  // Generate seriesId for new occurrences (shared with the source event)
  const seriesId = crypto.randomUUID();

  // Update source event with seriesId if it doesn't have one
  if (!sourceEvent.seriesId) {
    await db.calendarEvents.update(sourceEvent.id, { seriesId });
  }

  // Step 4: Build and persist new occurrences
  const occurrences = buildOccurrences({
    sourceEvent,
    dates: generatedDates,
    seriesId: sourceEvent.seriesId ?? seriesId,
  });

  await db.calendarEvents.bulkAdd(occurrences);
};
