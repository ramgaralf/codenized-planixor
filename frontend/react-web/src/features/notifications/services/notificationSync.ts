import { db } from '@/data/db';

import type { NotificationRecord } from '../types';

/**
 * Data Isolation (Req 13.3, 13.7):
 * This sync module only runs for authenticated users with an active subscription.
 * The caller (cross-cutting SyncService) gates invocation on auth + subscription status.
 * Foreign/rejected records returned by the API are discarded without persisting (see
 * pushNotificationRecords — rejected IDs are logged but never stored locally).
 * For free (anonymous) users, this module is never invoked — all data remains local-only.
 */

/**
 * Maximum number of records per push request to the API.
 */
export const PUSH_BATCH_SIZE = 100;

/**
 * Maximum number of records per pull response page from the API.
 */
export const PULL_PAGE_SIZE = 100;

/**
 * DTO for notification records sent over the wire during sync.
 * Dates are serialized as ISO strings; syncedAt is never transmitted.
 */
export interface NotificationRecordSyncRecord {
  id: string;
  calendarEventId: string;
  alertOffset: number;
  triggerTime: string;
  isDelivered: boolean;
  isRead: boolean;
  modifiedAt: string;
  isDeleted: boolean;
}

/**
 * API response after pushing notification records.
 */
export interface NotificationRecordSyncPushResponse {
  acknowledgedIds: string[];
  rejectedIds: { id: string; reason: string }[];
}

/**
 * API response when pulling notification records.
 */
export interface NotificationRecordSyncPullResponse {
  records: NotificationRecordSyncRecord[];
  cursor: string | null;
}

/**
 * Abstraction for the sync API client. Accepts this interface as a parameter
 * to keep the module testable without coupling to a specific HTTP client.
 */
export interface SyncApiClient {
  pushNotificationRecords(
    records: NotificationRecordSyncRecord[],
  ): Promise<NotificationRecordSyncPushResponse>;
  pullNotificationRecords(
    lastSyncedAt: string | null,
    cursor: string | null,
  ): Promise<NotificationRecordSyncPullResponse>;
}

/**
 * Selects notification records that need to be pushed to the remote API.
 * A record is a push candidate when it has never been synced (syncedAt is null)
 * or has been modified since the last sync (modifiedAt > syncedAt).
 */
export const getPushCandidates = (records: NotificationRecord[]): NotificationRecord[] => {
  return records.filter(
    (record) =>
      record.syncedAt === null ||
      record.modifiedAt.getTime() > record.syncedAt.getTime(),
  );
};

/**
 * Splits push candidates into batches of at most PUSH_BATCH_SIZE records.
 * Returns an array of arrays, each containing up to 100 records.
 */
export const batchForPush = (candidates: NotificationRecord[]): NotificationRecord[][] => {
  const batches: NotificationRecord[][] = [];

  for (let i = 0; i < candidates.length; i += PUSH_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + PUSH_BATCH_SIZE));
  }

  return batches;
};

/**
 * Converts a local NotificationRecord to a sync DTO for transmission.
 * Dates are serialized as ISO strings.
 */
export const toSyncRecord = (record: NotificationRecord): NotificationRecordSyncRecord => ({
  id: record.id,
  calendarEventId: record.calendarEventId,
  alertOffset: record.alertOffset,
  triggerTime: record.triggerTime.toISOString(),
  isDelivered: record.isDelivered,
  isRead: record.isRead,
  modifiedAt: record.modifiedAt.toISOString(),
  isDeleted: record.isDeleted,
});

/**
 * Converts a sync DTO back to a local NotificationRecord.
 * syncedAt is set to the provided timestamp (typically current UTC).
 */
export const fromSyncRecord = (
  record: NotificationRecordSyncRecord,
  syncedAt: Date,
): NotificationRecord => ({
  id: record.id,
  calendarEventId: record.calendarEventId,
  alertOffset: record.alertOffset,
  triggerTime: new Date(record.triggerTime),
  isDelivered: record.isDelivered,
  isRead: record.isRead,
  modifiedAt: new Date(record.modifiedAt),
  syncedAt,
  isDeleted: record.isDeleted,
});

/**
 * Resolves a conflict between a local and remote notification record with the same id.
 * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
 */
export const resolveConflict = (
  local: NotificationRecord,
  remote: NotificationRecord,
): NotificationRecord => {
  if (local.modifiedAt.getTime() > remote.modifiedAt.getTime()) {
    return local;
  }

  return remote;
};

/**
 * Merges pulled remote records into the local collection.
 *
 * For each remote record:
 * - If the remote id does not exist locally → toInsert with syncedAt set to now
 * - If the remote id exists locally AND local has no modifications (modifiedAt <= syncedAt)
 *   → toUpdate (overwrite with remote + syncedAt set to now)
 * - If the remote id exists locally AND local has modifications (modifiedAt > syncedAt)
 *   → apply LWW conflict resolution; if remote wins → toUpdate (with syncedAt set to now)
 * - If remote record has isDeleted === true → handled the same way (insert as deleted or overwrite)
 *
 * Returns arrays of records to insert and records to update in the local store.
 */
export const mergePulledRecords = (
  localRecords: NotificationRecord[],
  remoteRecords: NotificationRecordSyncRecord[],
): { toInsert: NotificationRecord[]; toUpdate: NotificationRecord[] } => {
  const now = new Date();
  const localMap = new Map(localRecords.map((record) => [record.id, record]));

  const toInsert: NotificationRecord[] = [];
  const toUpdate: NotificationRecord[] = [];

  for (const remoteRecord of remoteRecords) {
    const remote = fromSyncRecord(remoteRecord, now);
    const local = localMap.get(remote.id);

    if (!local) {
      // New remote record — insert with syncedAt set to now
      toInsert.push(remote);
    } else if (
      local.syncedAt !== null &&
      local.modifiedAt.getTime() <= local.syncedAt.getTime()
    ) {
      // Local record has no modifications since last sync — overwrite with remote
      toUpdate.push(remote);
    } else {
      // Local record has modifications — apply LWW conflict resolution
      const winner = resolveConflict(local, remote);

      if (winner === remote) {
        toUpdate.push(remote);
      }
    }
  }

  return { toInsert, toUpdate };
};

/**
 * Performs the push cycle: queries locally modified records, batches them,
 * sends to the API sequentially, and marks acknowledged records as synced.
 *
 * Rejected records are logged and discarded (foreign/unauthorized records).
 * Network failures propagate as exceptions — syncedAt remains unchanged.
 */
export const pushNotificationRecords = async (
  apiClient: SyncApiClient,
): Promise<void> => {
  const allRecords = await db.notifications.toArray();
  const candidates = getPushCandidates(allRecords);

  if (candidates.length === 0) {
    return;
  }

  const batches = batchForPush(candidates);

  for (const batch of batches) {
    const records = batch.map(toSyncRecord);
    const response = await apiClient.pushNotificationRecords(records);

    // Set syncedAt on acknowledged records
    if (response.acknowledgedIds.length > 0) {
      const now = new Date();
      await db.notifications
        .where('id')
        .anyOf(response.acknowledgedIds)
        .modify({ syncedAt: now });
    }

    // Log rejected records — discard without persisting
    if (response.rejectedIds.length > 0) {
      console.error(
        'Notification record sync push: records rejected by API',
        response.rejectedIds,
      );
    }
  }
};

/**
 * Performs the pull cycle: requests remote records modified after lastSyncedAt,
 * paginates until cursor is null, and merges into the local store.
 * Propagates deletions (if remote.isDeleted=true, local record is overwritten with isDeleted=true).
 * Network failures propagate as exceptions — caller handles gracefully.
 */
export const pullNotificationRecords = async (
  apiClient: SyncApiClient,
  lastSyncedAt: string | null,
): Promise<void> => {
  let cursor: string | null = null;

  do {
    const response = await apiClient.pullNotificationRecords(lastSyncedAt, cursor);

    if (response.records.length > 0) {
      // Fetch local records matching the pulled IDs for merge
      const remoteIds = response.records.map((r) => r.id);
      const localRecords = await db.notifications
        .where('id')
        .anyOf(remoteIds)
        .toArray();

      const { toInsert, toUpdate } = mergePulledRecords(
        localRecords,
        response.records,
      );

      // Bulk insert new records
      if (toInsert.length > 0) {
        await db.notifications.bulkAdd(toInsert);
      }

      // Bulk update existing records (includes deletion propagation)
      if (toUpdate.length > 0) {
        await db.notifications.bulkPut(toUpdate);
      }
    }

    cursor = response.cursor ?? null;
  } while (cursor !== null);
};

/**
 * Performs a full sync cycle for notification records: push then pull.
 *
 * Sync order within the overall cycle:
 *   1. Push CalendarEvents
 *   2. Push NotificationRecords  ← this module
 *   3. Pull CalendarEvents
 *   4. Pull NotificationRecords  ← this module
 *
 * Network failures propagate as exceptions — syncedAt remains unchanged
 * on affected records, ensuring they are retried in the next cycle.
 */
export const syncNotificationRecords = async (
  apiClient: SyncApiClient,
  lastSyncedAt: string | null,
): Promise<void> => {
  await pushNotificationRecords(apiClient);
  await pullNotificationRecords(apiClient, lastSyncedAt);
};
