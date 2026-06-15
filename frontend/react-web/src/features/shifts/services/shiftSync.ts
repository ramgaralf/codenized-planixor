import type { Shift } from '@features/shifts/models';

/**
 * Selects shift records that need to be pushed to the remote API.
 * A record is a push candidate when it has never been synced (syncedAt is null)
 * or has been modified since the last sync (modifiedAt > syncedAt).
 */
export const getPushCandidates = (shifts: Shift[]): Shift[] => {
  return shifts.filter(
    (shift) =>
      shift.syncedAt === null ||
      shift.modifiedAt.getTime() > shift.syncedAt.getTime(),
  );
};

/**
 * Resolves a conflict between a local and remote shift record with the same id.
 * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
 */
export const resolveConflict = (local: Shift, remote: Shift): Shift => {
  if (local.modifiedAt.getTime() > remote.modifiedAt.getTime()) {
    return local;
  }

  return remote;
};

/**
 * Merges pulled remote shifts into the local collection.
 *
 * For each remote shift:
 * - If the remote id does not exist locally → toInsert with syncedAt set to now
 * - If the remote id exists locally → apply conflict resolution;
 *   if remote wins → toUpdate (with syncedAt set to now)
 *
 * Returns arrays of shifts to insert and shifts to update in the local store.
 */
export const mergePulledShifts = (
  localShifts: Shift[],
  remoteShifts: Shift[],
): { toInsert: Shift[]; toUpdate: Shift[] } => {
  const now = new Date();
  const localMap = new Map(localShifts.map((shift) => [shift.id, shift]));

  const toInsert: Shift[] = [];
  const toUpdate: Shift[] = [];

  for (const remote of remoteShifts) {
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
