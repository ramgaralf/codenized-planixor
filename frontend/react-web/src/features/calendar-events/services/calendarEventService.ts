import { db } from '@/data/db';

import type { CalendarEvent, CalendarEventDisplay } from '../models';
import { validateTimeRange, checkOneShiftPerDay } from '../validation';
import { CALENDAR_EVENT_I18N_KEYS } from '../constants';

/**
 * Data Isolation (Req 13.1, 13.2):
 * This service operates exclusively on the local Dexie (IndexedDB) store.
 * Ownership is implicit — all records belong to the device's authenticated session.
 * No userId is stored per record; no remote/cross-user data is ever queried.
 * Sign-out/sign-in isolation (Req 13.5) is handled at the application level by
 * the auth module clearing or scoping the database on account switch.
 * Free (anonymous) users (Req 13.7) have sync inactive — this service works
 * fully offline with no network dependency.
 */

/**
 * Input type for creating a new calendar event.
 * System-managed fields (id, modifiedAt, syncedAt, isDeleted)
 * are generated automatically.
 */
export type CreateCalendarEventInput = Omit<
  CalendarEvent,
  'id' | 'modifiedAt' | 'syncedAt' | 'isDeleted'
>;

/**
 * Orphaned reference fallback values used when a referenced
 * shift or reminder does not exist in the local store.
 */
const ORPHANED_FALLBACK = {
  name: 'Unknown',
  icon: '❓',
  backgroundColor: 'transparent',
} as const;

/**
 * Derives display fields (name, icon, backgroundColor) for a calendar event
 * by looking up the referenced shift or reminder in the local store.
 * Falls back to ORPHANED_FALLBACK if the referenced entity is not found.
 */
const deriveDisplayFields = async (
  event: CalendarEvent,
): Promise<CalendarEventDisplay> => {
  let name: string = ORPHANED_FALLBACK.name;
  let icon: string = ORPHANED_FALLBACK.icon;
  let backgroundColor: string = ORPHANED_FALLBACK.backgroundColor;

  if (event.eventType === 'shift') {
    const shift = await db.shifts.get(event.eventTypeId);
    if (shift) {
      name = shift.name;
      icon = shift.icon;
      backgroundColor = shift.backgroundColor;
    }
  } else {
    const reminder = await db.reminders.get(event.eventTypeId);
    if (reminder) {
      name = reminder.name;
      icon = reminder.icon;
      backgroundColor = reminder.backgroundColor;
    }
  }

  return { ...event, name, icon, backgroundColor };
};

/**
 * Creates a new calendar event with system-generated fields.
 * Enforces dual validation: time range + one-shift-per-day.
 *
 * **Validates: Requirements 1.1, 7.2, 11.1, 11.5**
 */
export const create = async (input: CreateCalendarEventInput): Promise<CalendarEvent> => {
  if (!validateTimeRange(input.startTime, input.endTime)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_AFTER_START);
  }

  const existingEvents = await getShiftsForDate(input.day);
  if (!checkOneShiftPerDay(input.day, input.eventType, existingEvents)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY);
  }

  const event: CalendarEvent = {
    ...input,
    id: crypto.randomUUID(),
    modifiedAt: new Date(),
    syncedAt: null,
    isDeleted: false,
  };

  await db.calendarEvents.add(event);

  return event;
};

/**
 * Updates an existing calendar event.
 * Enforces dual validation: time range + one-shift-per-day.
 * Sets modifiedAt to UTC now and syncedAt to null.
 *
 * **Validates: Requirements 1.1, 7.2, 8.2, 11.4**
 */
export const update = async (
  id: string,
  changes: Partial<CalendarEvent>,
): Promise<CalendarEvent> => {
  const existing = await db.calendarEvents.get(id);
  if (!existing) {
    throw new Error(`Calendar event with id "${id}" not found`);
  }

  const merged = { ...existing, ...changes };

  if (!validateTimeRange(merged.startTime, merged.endTime)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_AFTER_START);
  }

  const existingEvents = await getShiftsForDate(merged.day, id);
  if (!checkOneShiftPerDay(merged.day, merged.eventType, existingEvents, id)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY);
  }

  const updatedEvent: CalendarEvent = {
    ...merged,
    id,
    modifiedAt: new Date(),
    syncedAt: null,
  };

  await db.calendarEvents.put(updatedEvent);

  return updatedEvent;
};

/**
 * Soft-deletes a calendar event by setting isDeleted = true,
 * modifiedAt to UTC now, and syncedAt to null.
 *
 * **Validates: Requirements 8.2, 11.4**
 */
export const softDelete = async (id: string): Promise<void> => {
  await db.calendarEvents.update(id, {
    isDeleted: true,
    modifiedAt: new Date(),
    syncedAt: null,
  });
};

/**
 * Retrieves all non-deleted calendar events within a date range (inclusive)
 * and derives display fields from the referenced shift/reminder store.
 *
 * **Validates: Requirements 11.2, 11.3**
 */
export const getByDateRange = async (
  startDate: string,
  endDate: string,
): Promise<CalendarEventDisplay[]> => {
  const events = await db.calendarEvents
    .where('day')
    .between(startDate, endDate, true, true)
    .filter((event) => event.isDeleted === false)
    .toArray();

  return Promise.all(events.map(deriveDisplayFields));
};

/**
 * Retrieves all non-deleted calendar events for an exact day
 * and derives display fields from the referenced shift/reminder store.
 *
 * **Validates: Requirements 11.2, 11.3**
 */
export const getByDate = async (day: string): Promise<CalendarEventDisplay[]> => {
  const events = await db.calendarEvents
    .where('day')
    .equals(day)
    .filter((event) => event.isDeleted === false)
    .toArray();

  return Promise.all(events.map(deriveDisplayFields));
};

/**
 * Returns non-deleted shift events for a given day.
 * Optionally excludes an event by ID (used during update validation).
 *
 * **Validates: Requirements 2.1, 11.1**
 */
export const getShiftsForDate = async (
  day: string,
  excludeId?: string,
): Promise<CalendarEvent[]> => {
  const events = await db.calendarEvents
    .where('day')
    .equals(day)
    .filter(
      (event) =>
        event.eventType === 'shift' &&
        event.isDeleted === false &&
        event.id !== excludeId,
    )
    .toArray();

  return events;
};
