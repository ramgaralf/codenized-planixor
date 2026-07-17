import { db } from '@/data/db';

/**
 * Deduplicates ShiftModeSetting records in IndexedDB.
 *
 * ShiftModeSetting is a single-row entity — only 1 record should exist per device.
 * Due to a sync pull bug (fixed), users may have accumulated multiple records.
 * This function keeps only the most recently modified record and deletes the rest.
 *
 * Safe to call at startup — it's a no-op when 0 or 1 records exist.
 *
 * @returns The number of duplicate records that were removed (0 if no duplicates).
 */
export const deduplicateShiftModeSettings = async (): Promise<number> => {
  const allRecords = await db.shiftModeSettings.toArray();

  if (allRecords.length <= 1) return 0;

  // Sort by modifiedAt descending — keep the most recent
  const sorted = [...allRecords].sort(
    (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
  );

  const toDelete = sorted.slice(1).map(r => r.id);
  await db.shiftModeSettings.bulkDelete(toDelete);

  return toDelete.length;
};
