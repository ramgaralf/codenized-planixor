import { db } from '@/data/db';

import type { CalendarEvent } from '@features/calendar-events/models';

import type { NotificationRecord } from '../types';
import { getChannel } from './notificationSettings';
import { deliverSystemNotification } from './systemNotificationDelivery';

/**
 * Notification Service — core notification logic for the React Web PWA.
 *
 * This service handles:
 * - Checking for due notifications and marking them as delivered
 * - Reconciling notification records when event alertOffsets or start time changes
 * - Cascade soft-deleting notifications when a calendar event is deleted
 * - Querying unread delivered notification count for the badge
 *
 * All operations are offline-first, operating against the local Dexie store.
 * No network connectivity is required.
 *
 * **Validates: Requirements 1.4, 1.5, 1.6, 1.8, 2.1, 2.2, 2.9, 8.3, 8.5, 8.7, 8.8, 9.1, 9.2**
 */

/**
 * Computes the event start DateTime in milliseconds using local midnight.
 *
 * Formula: startDay parsed as local date at 00:00 local + startTime minutes.
 * startTime represents minutes from local midnight (as entered in the time picker),
 * so we use local midnight as the base — matching how isAlertConfigVisible
 * in useEventForm.ts computes the start time.
 */
export const computeEventStartDateTime = (
  startDay: string,
  startTime: number,
): number => {
  const parts = startDay.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1; // JS months are 0-indexed
  const day = Number(parts[2]);
  const localMidnight = new Date(year, month, day, 0, 0, 0, 0);
  return localMidnight.getTime() + startTime * 60_000;
};

/**
 * Computes the trigger time for a notification in UTC milliseconds.
 *
 * Formula: eventStartDateTime - alertOffset minutes.
 */
export const computeTriggerTime = (
  eventStartDateTime: number,
  alertOffset: number,
): number => {
  return eventStartDateTime - alertOffset * 60_000;
};

/**
 * Resolves the display name for a notification record by joining
 * CalendarEvent → Shift/Reminder.
 *
 * Returns the shift/reminder name, or a fallback string if the
 * referenced entities cannot be found (defensive — should not happen
 * with soft-delete ensuring joins always succeed).
 */
export const resolveEventName = async (
  calendarEventId: string,
): Promise<string> => {
  const event = await db.calendarEvents.get(calendarEventId);
  if (!event) {
    return 'Planixor';
  }

  if (event.eventType === 'shift') {
    const shift = await db.shifts.get(event.eventTypeId);
    return shift?.name ?? 'Planixor';
  }

  const reminder = await db.reminders.get(event.eventTypeId);
  return reminder?.name ?? 'Planixor';
};

/**
 * Resolves the emoji icon for a notification record by joining
 * CalendarEvent → Shift/Reminder.
 *
 * Returns the shift/reminder icon, or a fallback calendar emoji if the
 * referenced entities cannot be found.
 */
export const resolveEventIcon = async (
  calendarEventId: string,
): Promise<string> => {
  const event = await db.calendarEvents.get(calendarEventId);
  if (!event) return '📅';

  if (event.eventType === 'shift') {
    const shift = await db.shifts.get(event.eventTypeId);
    return shift?.icon ?? '📅';
  }

  const reminder = await db.reminders.get(event.eventTypeId);
  return reminder?.icon ?? '📅';
};

/**
 * Runs a notification check cycle: queries for due notifications
 * (triggerTime <= now, isDelivered=false, isDeleted=false),
 * delivers them via the configured channel, and marks them as delivered.
 *
 * Channel routing logic:
 * - "app": mark isDelivered=true immediately (app notification is implicit —
 *   shown in NotificationView when isDelivered=true).
 * - "system": call deliverSystemNotification(). If returns true → mark isDelivered=true.
 *   If returns false → leave isDelivered=false (retry next cycle).
 * - "both": always mark isDelivered=true so the notification appears in the
 *   NotificationView (app channel). System notification is attempted as best-effort —
 *   its failure does not block the app notification from showing.
 *
 * Records are processed in triggerTime ascending order (oldest first).
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9, 2.10**
 */
export const runCheckCycle = async (): Promise<void> => {
  const now = new Date();
  const channel = await getChannel();

  const dueRecords = await db.notifications
    .where('triggerTime')
    .belowOrEqual(now)
    .filter(
      (record) => record.isDelivered === false && record.isDeleted === false,
    )
    .sortBy('triggerTime');

  for (const record of dueRecords) {
    if (channel === 'app') {
      // App-only: mark as delivered (shown in NotificationView)
      await db.notifications.update(record.id, {
        isDelivered: true,
        modifiedAt: new Date(),
      });
    } else if (channel === 'system') {
      // System-only: attempt native OS notification
      const eventName = await resolveEventName(record.calendarEventId);
      const eventIcon = await resolveEventIcon(record.calendarEventId);
      const event = await db.calendarEvents.get(record.calendarEventId);
      const startDay = event?.startDay ?? '';
      const startTime = event?.startTime ?? 0;
      const success = deliverSystemNotification(
        eventIcon,
        eventName,
        startDay,
        startTime,
        record.alertOffset,
      );

      if (success) {
        await db.notifications.update(record.id, {
          isDelivered: true,
          modifiedAt: new Date(),
        });
      }
      // If failed: leave isDelivered=false, retry next cycle
    } else {
      // "both": always mark as delivered (for app notification visibility)
      // and attempt system delivery as best-effort
      const eventName = await resolveEventName(record.calendarEventId);
      const eventIcon = await resolveEventIcon(record.calendarEventId);
      const event = await db.calendarEvents.get(record.calendarEventId);
      const startDay = event?.startDay ?? '';
      const startTime = event?.startTime ?? 0;

      // Attempt system notification (best-effort — don't block app delivery)
      deliverSystemNotification(
        eventIcon,
        eventName,
        startDay,
        startTime,
        record.alertOffset,
      );

      // Always mark as delivered so it appears in the notification view
      await db.notifications.update(record.id, {
        isDelivered: true,
        modifiedAt: new Date(),
      });
    }
  }
};

/**
 * Reconciles notification records when a calendar event's alertOffsets
 * or start time changes.
 *
 * Steps:
 * 1. Soft-delete all existing non-delivered, non-deleted records for the event.
 * 2. Create new NotificationRecords for each alertOffset whose computed
 *    trigger time is strictly in the future (triggerTime > Date.now()).
 * 3. Enforce uniqueness on (calendarEventId, alertOffset) among non-deleted records.
 *
 * **Validates: Requirements 1.4, 1.5, 1.6, 1.8, 8.3, 8.7, 8.8, 9.1, 9.2**
 */
export const reconcileNotifications = async (
  event: CalendarEvent,
): Promise<void> => {
  const now = Date.now();
  const modifiedAt = new Date();

  // Step 1: Soft-delete existing non-delivered records for this event
  const existingRecords = await db.notifications
    .where('calendarEventId')
    .equals(event.id)
    .filter(
      (record) => record.isDelivered === false && record.isDeleted === false,
    )
    .toArray();

  for (const record of existingRecords) {
    await db.notifications.update(record.id, {
      isDeleted: true,
      modifiedAt,
    });
  }

  // Step 2: Compute event start time and create new records for future trigger times
  const eventStartDateTime = computeEventStartDateTime(
    event.startDay,
    event.startTime,
  );

  const alertOffsets = event.alertOffsets ?? [];
  const newRecords: NotificationRecord[] = [];

  for (const alertOffset of alertOffsets) {
    const triggerTimeMs = computeTriggerTime(eventStartDateTime, alertOffset);

    // Only create records where trigger time is strictly in the future
    if (triggerTimeMs <= now) {
      continue;
    }

    // Step 3: Enforce uniqueness — check if a non-deleted record already exists
    // for this (calendarEventId, alertOffset) combination
    const existing = await db.notifications
      .where('calendarEventId')
      .equals(event.id)
      .filter(
        (record) =>
          record.alertOffset === alertOffset && record.isDeleted === false,
      )
      .first();

    if (existing) {
      continue;
    }

    newRecords.push({
      id: crypto.randomUUID(),
      calendarEventId: event.id,
      alertOffset,
      triggerTime: new Date(triggerTimeMs),
      isDelivered: false,
      isRead: false,
      modifiedAt,
      syncedAt: null,
      isDeleted: false,
    });
  }

  if (newRecords.length > 0) {
    await db.notifications.bulkAdd(newRecords);
  }
};

/**
 * Soft-deletes all non-deleted notification records for a given calendar event.
 * This is called when a calendar event is soft-deleted (cascade delete).
 *
 * Unlike reconcileNotifications, this deletes ALL records regardless of
 * delivery state (delivered or not).
 *
 * **Validates: Requirements 8.5, 9.4**
 */
export const deleteNotificationsForEvent = async (
  calendarEventId: string,
): Promise<void> => {
  const modifiedAt = new Date();

  const records = await db.notifications
    .where('calendarEventId')
    .equals(calendarEventId)
    .filter((record) => record.isDeleted === false)
    .toArray();

  for (const record of records) {
    await db.notifications.update(record.id, {
      isDeleted: true,
      modifiedAt,
    });
  }
};

/**
 * Returns the count of unread delivered notifications.
 * Query: isRead=false AND isDelivered=true AND isDeleted=false.
 *
 * Note: The compound index [isDelivered+isRead+isDeleted] is defined in the schema
 * for potential future use, but boolean IndexedDB keys have limited cross-browser
 * support. We use filter() as the reliable approach (acceptable given typical
 * notification volume < 1000 active records per device, as noted in the design doc).
 *
 * **Validates: Requirements 3.6**
 */
export const getUnreadCount = async (): Promise<number> => {
  const count = await db.notifications
    .filter(
      (record) =>
        record.isDelivered === true &&
        record.isRead === false &&
        record.isDeleted === false,
    )
    .count();

  return count;
};
