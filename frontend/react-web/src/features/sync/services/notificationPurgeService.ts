import { db } from '@/data/db';

/**
 * Result of a notification purge operation.
 */
export interface PurgeResult {
  /** Number of notification records permanently deleted */
  purgedCount: number;
  /** Error message if the purge failed, undefined on success */
  error?: string;
}

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * Extracted for testability.
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Purges past notification records from IndexedDB.
 *
 * A notification record is eligible for purge if:
 * 1. Its associated CalendarEvent does not exist in local storage (orphaned)
 * 2. Its associated CalendarEvent has a startDay strictly before today (YYYY-MM-DD comparison)
 *
 * Records whose CalendarEvent has startDay equal to or after today are never purged.
 *
 * This function never throws — errors are logged and returned in the result.
 *
 * @returns PurgeResult with the count of deleted records and an optional error message
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7
 */
export const purgePastNotifications = async (): Promise<PurgeResult> => {
  try {
    const allNotifications = await db.notifications.toArray();

    if (allNotifications.length === 0) {
      return { purgedCount: 0 };
    }

    const allCalendarEvents = await db.calendarEvents.toArray();

    // Build a map of calendarEvent ID → startDay for fast lookup
    const calendarEventStartDayMap = new Map<string, string>();
    for (const event of allCalendarEvents) {
      calendarEventStartDayMap.set(event.id, event.startDay);
    }

    const today = getTodayDateString();

    // Identify notification records eligible for purge:
    // - Orphaned (no matching CalendarEvent exists)
    // - Associated CalendarEvent's startDay is strictly before today
    const idsToPurge: string[] = [];
    for (const notification of allNotifications) {
      const startDay = calendarEventStartDayMap.get(notification.calendarEventId);
      const isOrphanedOrPast = startDay === undefined || startDay < today;

      if (isOrphanedOrPast) {
        idsToPurge.push(notification.id);
      }
    }

    if (idsToPurge.length === 0) {
      return { purgedCount: 0 };
    }

    // Permanently delete identified records from IndexedDB
    await db.notifications.bulkDelete(idsToPurge);

    return { purgedCount: idsToPurge.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Notification purge failed:', message);
    return { purgedCount: 0, error: message };
  }
};
