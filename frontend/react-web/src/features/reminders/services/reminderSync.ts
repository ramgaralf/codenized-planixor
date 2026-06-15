import type { Reminder } from '@features/reminders/models';

/**
 * Maximum number of records per push request to the API.
 */
export const PUSH_BATCH_SIZE = 100;

/**
 * Maximum number of records per pull response page from the API.
 */
export const PULL_PAGE_SIZE = 100;

/**
 * Selects reminder records that need to be pushed to the remote API.
 * A record is a push candidate when it has never been synced (syncedAt is null)
 * or has been modified since the last sync (modifiedAt > syncedAt).
 */
export const getPushCandidates = (reminders: Reminder[]): Reminder[] => {
  return reminders.filter(
    (reminder) =>
      reminder.syncedAt === null ||
      reminder.modifiedAt.getTime() > reminder.syncedAt.getTime(),
  );
};

/**
 * Splits push candidates into batches of at most PUSH_BATCH_SIZE records.
 * Returns an array of arrays, each containing up to 100 records.
 */
export const batchForPush = (candidates: Reminder[]): Reminder[][] => {
  const batches: Reminder[][] = [];

  for (let i = 0; i < candidates.length; i += PUSH_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + PUSH_BATCH_SIZE));
  }

  return batches;
};

/**
 * Resolves a conflict between a local and remote reminder record with the same id.
 * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
 */
export const resolveConflict = (
  local: Reminder,
  remote: Reminder,
): Reminder => {
  if (local.modifiedAt.getTime() > remote.modifiedAt.getTime()) {
    return local;
  }

  return remote;
};

/**
 * Merges pulled remote reminders into the local collection.
 *
 * For each remote reminder:
 * - If the remote id does not exist locally → toInsert with syncedAt set to now
 * - If the remote id exists locally → apply conflict resolution;
 *   if remote wins → toUpdate (with syncedAt set to now)
 *
 * Returns arrays of reminders to insert and reminders to update in the local store.
 */
export const mergePulledReminders = (
  localReminders: Reminder[],
  remoteReminders: Reminder[],
): { toInsert: Reminder[]; toUpdate: Reminder[] } => {
  const now = new Date();
  const localMap = new Map(
    localReminders.map((reminder) => [reminder.id, reminder]),
  );

  const toInsert: Reminder[] = [];
  const toUpdate: Reminder[] = [];

  for (const remote of remoteReminders) {
    const local = localMap.get(remote.id);

    if (!local) {
      toInsert.push({ ...remote, syncedAt: now });
    } else {
      const winner = resolveConflict(local, remote);

      if (winner === remote) {
        toUpdate.push({ ...remote, syncedAt: now });
      }
    }
  }

  return { toInsert, toUpdate };
};
