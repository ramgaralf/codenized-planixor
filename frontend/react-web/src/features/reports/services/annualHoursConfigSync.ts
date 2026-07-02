import { db } from '@/data/db';

import type { AnnualHoursConfig } from '../models';
import { createSyncBatches } from './reportAggregator';

/**
 * Data Isolation (Req 10.3):
 * This sync module only runs for authenticated users with an active subscription.
 * The caller (cross-cutting SyncService) gates invocation on auth + subscription status.
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
 * DTO for AnnualHoursConfig records sent over the wire during sync.
 * Dates are serialized as ISO strings; syncedAt is never transmitted.
 */
export interface AnnualHoursConfigSyncRecord {
  id: string;
  year: number;
  configuredHours: number;
  modifiedAt: string;
  syncedAt: string | null;
  isDeleted: boolean;
}

/**
 * API response after pushing AnnualHoursConfig records.
 */
export interface AnnualHoursConfigSyncPushResponse {
  processedCount: number;
}

/**
 * API response when pulling AnnualHoursConfig records.
 */
export interface AnnualHoursConfigSyncPullResponse {
  records: AnnualHoursConfigSyncRecord[];
  nextCursor: string | null;
}

/**
 * Abstraction for the sync API client. Accepts this interface as a parameter
 * to keep the module testable without coupling to a specific HTTP client.
 */
export interface AnnualHoursConfigSyncApiClient {
  pushAnnualHoursConfig(
    records: AnnualHoursConfigSyncRecord[],
  ): Promise<AnnualHoursConfigSyncPushResponse>;
  pullAnnualHoursConfig(
    lastSyncedAt: string | null,
    cursor: string | null,
  ): Promise<AnnualHoursConfigSyncPullResponse>;
}

/**
 * Selects AnnualHoursConfig records that need to be pushed to the remote API.
 * A record is a push candidate when it has never been synced (syncedAt is null)
 * or has been modified since the last sync (modifiedAt > syncedAt).
 */
export const getPushCandidates = (
  records: AnnualHoursConfig[],
): AnnualHoursConfig[] => {
  return records.filter(
    (record) =>
      record.syncedAt === null ||
      record.modifiedAt.getTime() > record.syncedAt.getTime(),
  );
};

/**
 * Splits push candidates into batches of at most PUSH_BATCH_SIZE records.
 * Uses the shared createSyncBatches utility from reportAggregator.
 */
export const batchForPush = (
  candidates: AnnualHoursConfig[],
): AnnualHoursConfig[][] => {
  return createSyncBatches(candidates, PUSH_BATCH_SIZE);
};

/**
 * Converts a local AnnualHoursConfig to a sync DTO for transmission.
 * Dates are serialized as ISO strings.
 */
export const toSyncRecord = (
  record: AnnualHoursConfig,
): AnnualHoursConfigSyncRecord => ({
  id: record.id,
  year: record.year,
  configuredHours: record.configuredHours,
  modifiedAt: record.modifiedAt.toISOString(),
  syncedAt: record.syncedAt ? record.syncedAt.toISOString() : null,
  isDeleted: record.isDeleted,
});

/**
 * Converts a sync DTO back to a local AnnualHoursConfig.
 * syncedAt is set to the provided timestamp (typically current UTC).
 */
export const fromSyncRecord = (
  record: AnnualHoursConfigSyncRecord,
  syncedAt: Date,
): AnnualHoursConfig => ({
  id: record.id,
  year: record.year,
  configuredHours: record.configuredHours,
  modifiedAt: new Date(record.modifiedAt),
  syncedAt,
  isDeleted: record.isDeleted,
});

/**
 * Resolves a conflict between a local and remote AnnualHoursConfig record with the same id.
 * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
 */
export const resolveConflict = (
  local: AnnualHoursConfig,
  remote: AnnualHoursConfig,
): AnnualHoursConfig => {
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
  localRecords: AnnualHoursConfig[],
  remoteRecords: AnnualHoursConfigSyncRecord[],
): { toInsert: AnnualHoursConfig[]; toUpdate: AnnualHoursConfig[] } => {
  const now = new Date();
  const localMap = new Map(localRecords.map((record) => [record.id, record]));

  const toInsert: AnnualHoursConfig[] = [];
  const toUpdate: AnnualHoursConfig[] = [];

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
 * Determines if an HTTP status code indicates a server error (5xx).
 */
const isServerError = (status: number): boolean =>
  status >= 500 && status < 600;

/**
 * Determines if an HTTP status code indicates a client error (4xx).
 */
const isClientError = (status: number): boolean =>
  status >= 400 && status < 500;

/**
 * Custom error class for sync API errors with HTTP status code.
 */
export class SyncApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SyncApiError';
  }
}

/**
 * Performs the push cycle: queries locally modified records, batches them,
 * sends to the API sequentially, and marks pushed records as synced.
 *
 * Error handling:
 * - 5xx errors: stop push cycle immediately, leave records as pending
 * - 4xx errors: mark records in the batch as synced, continue cycle
 */
export const pushAnnualHoursConfig = async (
  apiClient: AnnualHoursConfigSyncApiClient,
): Promise<void> => {
  const allRecords = await db.annualHoursConfig.toArray();
  const candidates = getPushCandidates(allRecords);

  if (candidates.length === 0) {
    return;
  }

  const batches = batchForPush(candidates);

  for (const batch of batches) {
    const records = batch.map(toSyncRecord);

    try {
      await apiClient.pushAnnualHoursConfig(records);

      // Mark all records in the batch as synced
      const now = new Date();
      const ids = batch.map((r) => r.id);
      await db.annualHoursConfig
        .where('id')
        .anyOf(ids)
        .modify({ syncedAt: now });
    } catch (error: unknown) {
      if (error instanceof SyncApiError) {
        if (isServerError(error.status)) {
          // 5xx: stop push cycle, leave records as pending
          return;
        }

        if (isClientError(error.status)) {
          // 4xx: mark records as synced (business/validation rejection), continue cycle
          const now = new Date();
          const ids = batch.map((r) => r.id);
          await db.annualHoursConfig
            .where('id')
            .anyOf(ids)
            .modify({ syncedAt: now });
          continue;
        }
      }

      // Unknown error: stop push cycle (safe default)
      console.error('AnnualHoursConfig sync push: unexpected error', error);
      return;
    }
  }
};

/**
 * Performs the pull cycle: requests remote records modified after lastSyncedAt,
 * paginates until cursor is null, and merges into the local store.
 */
export const pullAnnualHoursConfig = async (
  apiClient: AnnualHoursConfigSyncApiClient,
  lastSyncedAt: string | null,
): Promise<void> => {
  let cursor: string | null = null;

  do {
    const response = await apiClient.pullAnnualHoursConfig(
      lastSyncedAt,
      cursor,
    );

    if (response.records.length > 0) {
      // Fetch local records matching the pulled IDs for merge
      const remoteIds = response.records.map((r) => r.id);
      const localRecords = await db.annualHoursConfig
        .where('id')
        .anyOf(remoteIds)
        .toArray();

      const { toInsert, toUpdate } = mergePulledRecords(
        localRecords,
        response.records,
      );

      // Bulk insert new records
      if (toInsert.length > 0) {
        await db.annualHoursConfig.bulkAdd(toInsert);
      }

      // Bulk update existing records
      if (toUpdate.length > 0) {
        await db.annualHoursConfig.bulkPut(toUpdate);
      }
    }

    cursor = response.nextCursor ?? null;
  } while (cursor !== null);
};

/**
 * Performs a full sync cycle: push local changes then pull remote changes.
 */
export const syncAnnualHoursConfig = async (
  apiClient: AnnualHoursConfigSyncApiClient,
  lastSyncedAt: string | null,
): Promise<void> => {
  await pushAnnualHoursConfig(apiClient);
  await pullAnnualHoursConfig(apiClient, lastSyncedAt);
};
