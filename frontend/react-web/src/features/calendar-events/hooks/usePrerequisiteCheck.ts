import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/data/db';

import { checkPrerequisites } from '../services/prerequisiteService';
import type { PrerequisiteResult } from '../services/prerequisiteService';

export interface UsePrerequisiteCheckReturn {
  result: PrerequisiteResult;
  isLoading: boolean;
}

/**
 * Hook that queries Dexie for active (isDeleted=false) shifts and reminders,
 * then returns the prerequisite check result.
 *
 * Uses `useLiveQuery` so the result reactively updates when the underlying
 * IndexedDB data changes (e.g., user creates a shift from another tab).
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.8**
 */
export const usePrerequisiteCheck = (): UsePrerequisiteCheckReturn => {
  const queryResult = useLiveQuery(async () => {
    const activeShiftCount = await db.shifts
      .filter((r) => !r.isDeleted)
      .count();

    const activeReminderCount = await db.reminders
      .filter((r) => !r.isDeleted)
      .count();

    return checkPrerequisites(activeShiftCount, activeReminderCount);
  }, []);

  return {
    result: queryResult ?? { canCreate: false, missingShifts: true, missingReminders: true },
    isLoading: queryResult === undefined,
  };
};
