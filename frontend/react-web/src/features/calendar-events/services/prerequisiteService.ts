/**
 * Prerequisite check for calendar event creation.
 *
 * Determines whether the user can create a calendar event based on the
 * existence of active (non-deleted) shifts and reminders.
 *
 * This is a pure function with no database dependencies — it receives
 * counts and returns a result. The hook layer handles querying Dexie.
 */

export type PrerequisiteResult =
  | { canCreate: true }
  | { canCreate: false; missingShifts: boolean; missingReminders: boolean };

/**
 * Checks whether the prerequisites for creating a calendar event are met.
 *
 * @param activeShiftCount - Number of shifts where isDeleted=false
 * @param activeReminderCount - Number of reminders where isDeleted=false
 * @returns PrerequisiteResult indicating whether creation is allowed
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.8**
 */
export const checkPrerequisites = (
  activeShiftCount: number,
  activeReminderCount: number,
): PrerequisiteResult => {
  if (activeShiftCount > 0 || activeReminderCount > 0) {
    return { canCreate: true };
  }
  return {
    canCreate: false,
    missingShifts: activeShiftCount === 0,
    missingReminders: activeReminderCount === 0,
  };
};
