import { db } from '@/data/db';

import type { Reminder } from '@features/reminders/models';

/**
 * Input type for creating a new reminder.
 * System-managed fields (id, modifiedAt, syncedAt, isDeleted, isActive, createdAt)
 * are generated automatically.
 */
export type CreateReminderInput = Omit<
  Reminder,
  'id' | 'modifiedAt' | 'syncedAt' | 'isDeleted' | 'isActive' | 'createdAt'
>;

/**
 * Retrieves all non-deleted reminders ordered by createdAt ascending (oldest first).
 */
export const getAll = async (): Promise<Reminder[]> => {
  return db.reminders
    .orderBy('createdAt')
    .filter((reminder) => reminder.isDeleted === false)
    .toArray();
};

/**
 * Retrieves a single reminder by its ID.
 * Returns undefined if the reminder does not exist.
 */
export const getById = async (id: string): Promise<Reminder | undefined> => {
  return db.reminders.get(id);
};

/**
 * Creates a new reminder with system-generated fields.
 * Generates a client-side UUID, sets isActive=true, isDeleted=false,
 * syncedAt=null, createdAt=now, modifiedAt=now.
 * Duplicate names are permitted (no uniqueness check on name).
 */
export const create = async (input: CreateReminderInput): Promise<Reminder> => {
  const now = new Date();

  const reminder: Reminder = {
    ...input,
    id: crypto.randomUUID(),
    isActive: true,
    seriesFrequency: input.seriesFrequency ?? 'never',
    seriesEndDate: input.seriesEndDate ?? null,
    createdAt: now,
    modifiedAt: now,
    syncedAt: null,
    isDeleted: false,
  };

  await db.reminders.add(reminder);

  return reminder;
};

/**
 * Updates an existing reminder's user-editable fields.
 * Preserves id, syncedAt, and isDeleted. Updates modifiedAt to now.
 */
export const update = async (
  id: string,
  data: Partial<Pick<Reminder, 'name' | 'icon' | 'backgroundColor' | 'seriesFrequency' | 'seriesEndDate'>>,
): Promise<void> => {
  await db.reminders.update(id, {
    ...data,
    modifiedAt: new Date(),
  });
};

/**
 * Soft-deletes a reminder by setting isDeleted=true, syncedAt=null,
 * and updating modifiedAt.
 */
export const softDelete = async (id: string): Promise<void> => {
  await db.reminders.update(id, {
    isDeleted: true,
    syncedAt: null,
    modifiedAt: new Date(),
  });
};

/**
 * Deactivates a reminder by setting isActive=false and updating modifiedAt.
 */
export const deactivate = async (id: string): Promise<void> => {
  await db.reminders.update(id, {
    isActive: false,
    modifiedAt: new Date(),
  });
};

/**
 * Activates a reminder by setting isActive=true and updating modifiedAt.
 */
export const activate = async (id: string): Promise<void> => {
  await db.reminders.update(id, {
    isActive: true,
    modifiedAt: new Date(),
  });
};

/**
 * Retrieves all active, non-deleted reminders for calendar event selection.
 * Only reminders with isActive=true are included — deactivated reminders
 * are excluded from the list of selectable reminders during calendar event creation.
 *
 * Results are ordered by createdAt ascending (oldest first).
 */
export const getActiveForSelection = async (): Promise<Reminder[]> => {
  return db.reminders
    .orderBy('createdAt')
    .filter((reminder) => reminder.isDeleted === false && reminder.isActive === true)
    .toArray();
};

/**
 * Retrieves all reminders that have not been synced or have been
 * modified since their last sync. Used by the sync service to
 * determine which records to push to the remote API.
 */
export const getUnsynced = async (): Promise<Reminder[]> => {
  return db.reminders
    .toArray()
    .then((reminders) =>
      reminders.filter(
        (r) =>
          r.syncedAt === null ||
          r.modifiedAt.getTime() > r.syncedAt.getTime(),
      ),
    );
};

/**
 * Applies remote records to the local store with last-writer-wins
 * conflict resolution (remote wins on tie).
 *
 * For each remote record:
 * - If the record does not exist locally → insert with syncedAt set to now
 * - If the record exists locally and local modifiedAt ≤ local syncedAt
 *   → overwrite with remote values and set syncedAt to now
 * - If the record exists locally and local modifiedAt > remote modifiedAt
 *   → skip (local is newer)
 * - If both modifiedAt are identical → remote wins (insert remote with syncedAt=now)
 */
export const applyRemoteRecords = async (
  records: Reminder[],
): Promise<void> => {
  const now = new Date();

  await db.transaction('rw', db.reminders, async () => {
    for (const remote of records) {
      const local = await db.reminders.get(remote.id);

      if (!local) {
        await db.reminders.add({ ...remote, syncedAt: now });
      } else {
        // Local has not been modified since last sync — safe to overwrite
        if (
          local.syncedAt !== null &&
          local.modifiedAt.getTime() <= local.syncedAt.getTime()
        ) {
          await db.reminders.put({ ...remote, syncedAt: now });
        } else {
          // Local has pending changes — apply last-writer-wins
          if (local.modifiedAt.getTime() > remote.modifiedAt.getTime()) {
            // Local is newer — keep local, skip remote
            continue;
          }
          // Remote is newer or tie — remote wins
          await db.reminders.put({ ...remote, syncedAt: now });
        }
      }
    }
  });
};
