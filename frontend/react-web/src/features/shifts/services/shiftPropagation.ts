import { db } from '@/data/db';
import { computeEndDayForShift } from '@features/calendar-events/validation';

/**
 * Checks if a shift has non-deleted calendar events in the current year.
 * Returns the count of affected events, or 0 if none.
 *
 * **Validates: Requirements 6.1, 6.5**
 */
export const checkShiftPropagationNeeded = async (shiftId: string): Promise<number> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const count = await db.calendarEvents
    .where('eventType').equals('shift')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === shiftId &&
      e.startDay >= startOfYear &&
      e.startDay <= endOfYear
    )
    .count();

  return count;
};

/**
 * Propagates shift template changes to all affected current-year calendar events.
 * Updates: startTime, endTime, totalHours (from hoursWorked), endDay (recomputed),
 * modifiedAt (current UTC), syncedAt (null for re-sync).
 *
 * **Validates: Requirements 6.3, 6.6, 6.8**
 */
export const propagateShiftChanges = async (
  shiftId: string,
  startTime: number,
  endTime: number,
  hoursWorked: number,
): Promise<void> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  await db.calendarEvents
    .where('eventType').equals('shift')
    .filter((e) =>
      !e.isDeleted &&
      e.eventTypeId === shiftId &&
      e.startDay >= startOfYear &&
      e.startDay <= endOfYear
    )
    .modify((event) => {
      event.startTime = startTime;
      event.endTime = endTime;
      event.totalHours = hoursWorked;
      event.endDay = computeEndDayForShift(event.startDay, startTime, endTime);
      event.modifiedAt = new Date();
      event.syncedAt = null;
    });
};
