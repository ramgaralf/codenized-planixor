import { db } from '@/data/db';

/**
 * Checks if a reminder has non-deleted calendar events in the current year.
 * Used to determine if propagation is needed after reminder edits.
 *
 * Validates: Requirements 7.1, 7.3
 */
export const checkReminderPropagationNeeded = async (reminderId: string): Promise<number> => {
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
 * Propagates reminder template changes by touching modifiedAt/syncedAt on
 * affected events. Display fields (name, icon, backgroundColor) are derived
 * at read time — no direct field update needed. The modifiedAt touch ensures
 * sync propagation and signals freshness.
 *
 * Validates: Requirements 7.5, 7.6, 7.8
 */
export const propagateReminderChanges = async (reminderId: string): Promise<void> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;
  const now = new Date();

  await db.calendarEvents
    .where('eventType').equals('reminder')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === reminderId &&
      e.startDay >= startOfYear &&
      e.startDay <= endOfYear
    )
    .modify((event) => {
      event.modifiedAt = now;
      event.syncedAt = null;
    });
};
