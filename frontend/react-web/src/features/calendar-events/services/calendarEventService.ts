import { db } from '@/data/db';
import {
  reconcileNotifications,
  deleteNotificationsForEvent,
} from '@features/notifications/services/notificationService';
import { triggerImmediateCheckCycle } from '@features/notifications/services/notificationWorkerManager';

import type { CalendarEvent, CalendarEventDisplay } from '../models';
import {
  validateDayRange,
  validateTimeForReminder,
  computeTotalHours,
  computeEndDayForShift,
  checkOneShiftPerDay,
  validateNotes,
  validateRequiredFields,
} from '../validation';
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
 * System-managed fields (id, modifiedAt, syncedAt, isDeleted, totalHours)
 * are generated automatically.
 */
export type CreateCalendarEventInput = Omit<
  CalendarEvent,
  'id' | 'modifiedAt' | 'syncedAt' | 'isDeleted' | 'totalHours'
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
 * Resolves the shiftHoursWorked value from the referenced shift definition.
 * Returns undefined if the event is not a shift or the shift is not found.
 */
const resolveShiftHoursWorked = async (
  eventType: 'shift' | 'reminder',
  eventTypeId: string,
): Promise<number | undefined> => {
  if (eventType !== 'shift') {
    return undefined;
  }
  const shift = await db.shifts.get(eventTypeId);
  return shift?.hoursWorked;
};

/**
 * Creates a new calendar event with system-generated fields.
 * Enforces dual validation: day range, time (reminders), one-shift-per-day,
 * notes length, and required fields. For shifts, auto-sets endDay via
 * computeEndDayForShift() when crossing midnight.
 *
 * **Validates: Requirements 1.1, 1.6, 7.2, 11.5, 11.6, 11.7**
 */
export const create = async (input: CreateCalendarEventInput): Promise<CalendarEvent> => {
  let { endDay } = input;
  const { eventType, eventTypeId, startDay, startTime, endTime } = input;

  // For shift events, auto-compute endDay based on crossing midnight
  if (eventType === 'shift') {
    endDay = computeEndDayForShift(startDay, startTime, endTime);
  }

  // Validate day range: endDay >= startDay
  if (!validateDayRange(startDay, endDay)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE);
  }

  // Validate time for reminders: endTime > startTime when endDay == startDay
  if (eventType === 'reminder' && !validateTimeForReminder(startDay, endDay, startTime, endTime)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER);
  }

  // Validate notes length
  if (!validateNotes(input.notes)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_NOTES_MAX_LENGTH);
  }

  // Enforce one-shift-per-day constraint
  const existingEvents = await getShiftsForDate(startDay);
  if (!checkOneShiftPerDay(startDay, eventType, existingEvents)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY);
  }

  // Compute totalHours based on event type
  const shiftHoursWorked = await resolveShiftHoursWorked(eventType, eventTypeId);
  const totalHours = computeTotalHours(eventType, startDay, endDay, startTime, endTime, shiftHoursWorked);

  const event: CalendarEvent = {
    ...input,
    endDay,
    totalHours,
    id: crypto.randomUUID(),
    modifiedAt: new Date(),
    syncedAt: null,
    isDeleted: false,
  };

  // Validate required fields as a final check
  const validation = validateRequiredFields(event);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError);
  }

  await db.calendarEvents.add(event);

  // Reconcile notifications after persisting (creates NotificationRecords for future trigger times)
  await reconcileNotifications(event);

  // Trigger immediate check cycle so due notifications are delivered right away
  await triggerImmediateCheckCycle();

  return event;
};

/**
 * Updates an existing calendar event.
 * Enforces dual validation: day range, time (reminders), one-shift-per-day,
 * notes length, and required fields. Recomputes totalHours and auto-sets
 * endDay for shifts crossing midnight.
 * Sets modifiedAt to UTC now and syncedAt to null.
 *
 * **Validates: Requirements 1.1, 1.6, 7.2, 8.2, 11.4, 11.5, 11.6, 11.7**
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

  // For shift events, auto-compute endDay based on crossing midnight
  if (merged.eventType === 'shift') {
    merged.endDay = computeEndDayForShift(merged.startDay, merged.startTime, merged.endTime);
  }

  // Validate day range: endDay >= startDay
  if (!validateDayRange(merged.startDay, merged.endDay)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE);
  }

  // Validate time for reminders: endTime > startTime when endDay == startDay
  if (merged.eventType === 'reminder' && !validateTimeForReminder(merged.startDay, merged.endDay, merged.startTime, merged.endTime)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER);
  }

  // Validate notes length
  if (!validateNotes(merged.notes)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_NOTES_MAX_LENGTH);
  }

  // Enforce one-shift-per-day constraint (exclude the event being updated)
  const existingEvents = await getShiftsForDate(merged.startDay, id);
  if (!checkOneShiftPerDay(merged.startDay, merged.eventType, existingEvents, id)) {
    throw new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY);
  }

  // Recompute totalHours based on event type
  const shiftHoursWorked = await resolveShiftHoursWorked(merged.eventType, merged.eventTypeId);
  const totalHours = computeTotalHours(merged.eventType, merged.startDay, merged.endDay, merged.startTime, merged.endTime, shiftHoursWorked);

  const updatedEvent: CalendarEvent = {
    ...merged,
    totalHours,
    id,
    modifiedAt: new Date(),
    syncedAt: null,
  };

  // Validate required fields as a final check
  const validation = validateRequiredFields(updatedEvent);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError);
  }

  await db.calendarEvents.put(updatedEvent);

  // Reconcile notifications if alertOffsets or start time changed
  const alertOffsetsChanged =
    JSON.stringify(existing.alertOffsets ?? []) !==
    JSON.stringify(updatedEvent.alertOffsets ?? []);
  const startTimeChanged =
    existing.startDay !== updatedEvent.startDay ||
    existing.startTime !== updatedEvent.startTime;

  if (alertOffsetsChanged || startTimeChanged) {
    await reconcileNotifications(updatedEvent);
    // Trigger immediate check cycle so due notifications are delivered right away
    await triggerImmediateCheckCycle();
  }

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

  // Cascade soft-delete all notification records for this event
  await deleteNotificationsForEvent(id);

  // Trigger immediate check cycle so badge count updates right away
  await triggerImmediateCheckCycle();
};

/**
 * Retrieves all non-deleted calendar events within a date range (inclusive)
 * using range intersection logic: events where startDay <= endDate AND endDay >= startDate.
 * Derives display fields from the referenced shift/reminder store.
 *
 * **Validates: Requirements 11.2, 11.3**
 */
export const getByDateRange = async (
  startDate: string,
  endDate: string,
): Promise<CalendarEventDisplay[]> => {
  // Range intersection: event is visible if startDay <= endDate AND endDay >= startDate
  const events = await db.calendarEvents
    .where('startDay')
    .belowOrEqual(endDate)
    .filter((event) => event.endDay >= startDate && event.isDeleted === false)
    .toArray();

  return Promise.all(events.map(deriveDisplayFields));
};

/**
 * Retrieves all non-deleted calendar events that cover a specific day.
 * An event covers a day if startDay <= day <= endDay.
 * Derives display fields from the referenced shift/reminder store.
 *
 * **Validates: Requirements 11.2, 11.3**
 */
export const getByDate = async (day: string): Promise<CalendarEventDisplay[]> => {
  // Event covers this day if startDay <= day AND endDay >= day
  const events = await db.calendarEvents
    .where('startDay')
    .belowOrEqual(day)
    .filter((event) => event.endDay >= day && event.isDeleted === false)
    .toArray();

  return Promise.all(events.map(deriveDisplayFields));
};

/**
 * Returns non-deleted shift events for a given startDay.
 * Optionally excludes an event by ID (used during update validation).
 *
 * **Validates: Requirements 2.1, 11.1**
 */
export const getShiftsForDate = async (
  startDay: string,
  excludeId?: string,
): Promise<CalendarEvent[]> => {
  const events = await db.calendarEvents
    .where('startDay')
    .equals(startDay)
    .filter(
      (event) =>
        event.eventType === 'shift' &&
        event.isDeleted === false &&
        event.id !== excludeId,
    )
    .toArray();

  return events;
};
