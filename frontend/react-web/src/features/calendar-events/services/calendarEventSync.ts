import { db } from '@/data/db';

import type { CalendarEvent } from '../models';

/**
 * Data Isolation (Req 13.3, 13.7):
 * This sync module only runs for authenticated users with an active subscription.
 * The caller (cross-cutting SyncService) gates invocation on auth + subscription status.
 * Foreign/rejected records returned by the API are discarded without persisting (see
 * pushCalendarEvents — rejected IDs are logged but never stored locally).
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
 * DTO for calendar event records sent over the wire during sync.
 * Dates are serialized as ISO strings; syncedAt is never transmitted.
 */
export interface CalendarEventSyncRecord {
  id: string;
  eventType: 'shift' | 'reminder';
  eventTypeId: string;
  day: string;
  startTime: number;
  endTime: number;
  notes: string | null;
  modifiedAt: string;
  isDeleted: boolean;
}

/**
 * API response after pushing calendar event records.
 */
export interface CalendarEventSyncPushResponse {
  acknowledgedIds: string[];
  rejectedIds: { id: string; reason: string }[];
}

/**
 * API response when pulling calendar event records.
 */
export interface CalendarEventSyncPullResponse {
  records: CalendarEventSyncRecord[];
  cursor: string | null;
}

/**
 * Abstraction for the sync API client. Accepts this interface as a parameter
 * to keep the module testable without coupling to a specific HTTP client.
 */
export interface SyncApiClient {
  pushCalendarEvents(
    records: CalendarEventSyncRecord[],
  ): Promise<CalendarEventSyncPushResponse>;
  pullCalendarEvents(
    lastSyncedAt: string | null,
    cursor: string | null,
  ): Promise<CalendarEventSyncPullResponse>;
}

/**
 * Selects calendar event records that need to be pushed to the remote API.
 * A record is a push candidate when it has never been synced (syncedAt is null)
 * or has been modified since the last sync (modifiedAt > syncedAt).
 */
export const getPushCandidates = (events: CalendarEvent[]): CalendarEvent[] => {
  return events.filter(
    (event) =>
      event.syncedAt === null ||
      event.modifiedAt.getTime() > event.syncedAt.getTime(),
  );
};

/**
 * Splits push candidates into batches of at most PUSH_BATCH_SIZE records.
 * Returns an array of arrays, each containing up to 100 records.
 */
export const batchForPush = (candidates: CalendarEvent[]): CalendarEvent[][] => {
  const batches: CalendarEvent[][] = [];

  for (let i = 0; i < candidates.length; i += PUSH_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + PUSH_BATCH_SIZE));
  }

  return batches;
};

/**
 * Converts a local CalendarEvent to a sync DTO for transmission.
 * Dates are serialized as ISO strings.
 */
export const toSyncRecord = (event: CalendarEvent): CalendarEventSyncRecord => ({
  id: event.id,
  eventType: event.eventType,
  eventTypeId: event.eventTypeId,
  day: event.day,
  startTime: event.startTime,
  endTime: event.endTime,
  notes: event.notes,
  modifiedAt: event.modifiedAt.toISOString(),
  isDeleted: event.isDeleted,
});

/**
 * Converts a sync DTO back to a local CalendarEvent.
 * syncedAt is set to the provided timestamp (typically current UTC).
 */
export const fromSyncRecord = (
  record: CalendarEventSyncRecord,
  syncedAt: Date,
): CalendarEvent => ({
  id: record.id,
  eventType: record.eventType,
  eventTypeId: record.eventTypeId,
  day: record.day,
  startTime: record.startTime,
  endTime: record.endTime,
  notes: record.notes,
  modifiedAt: new Date(record.modifiedAt),
  syncedAt,
  isDeleted: record.isDeleted,
});

/**
 * Resolves a conflict between a local and remote calendar event record with the same id.
 * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
 */
export const resolveConflict = (
  local: CalendarEvent,
  remote: CalendarEvent,
): CalendarEvent => {
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
 * Returns arrays of events to insert and events to update in the local store.
 */
export const mergePulledEvents = (
  localEvents: CalendarEvent[],
  remoteRecords: CalendarEventSyncRecord[],
): { toInsert: CalendarEvent[]; toUpdate: CalendarEvent[] } => {
  const now = new Date();
  const localMap = new Map(localEvents.map((event) => [event.id, event]));

  const toInsert: CalendarEvent[] = [];
  const toUpdate: CalendarEvent[] = [];

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
 */
export const pushCalendarEvents = async (
  apiClient: SyncApiClient,
): Promise<void> => {
  const allEvents = await db.calendarEvents.toArray();
  const candidates = getPushCandidates(allEvents);

  if (candidates.length === 0) {
    return;
  }

  const batches = batchForPush(candidates);

  for (const batch of batches) {
    const records = batch.map(toSyncRecord);
    const response = await apiClient.pushCalendarEvents(records);

    // Set syncedAt on acknowledged records
    if (response.acknowledgedIds.length > 0) {
      const now = new Date();
      await db.calendarEvents
        .where('id')
        .anyOf(response.acknowledgedIds)
        .modify({ syncedAt: now });
    }

    // Log rejected records — discard without persisting
    if (response.rejectedIds.length > 0) {
      console.error(
        'Calendar event sync push: records rejected by API',
        response.rejectedIds,
      );
    }
  }
};

/**
 * Performs the pull cycle: requests remote records modified after lastSyncedAt,
 * paginates until cursor is null, and merges into the local store.
 */
export const pullCalendarEvents = async (
  apiClient: SyncApiClient,
  lastSyncedAt: string | null,
): Promise<void> => {
  let cursor: string | null = null;

  do {
    const response = await apiClient.pullCalendarEvents(lastSyncedAt, cursor);

    if (response.records.length > 0) {
      // Fetch local events matching the pulled IDs for merge
      const remoteIds = response.records.map((r) => r.id);
      const localEvents = await db.calendarEvents
        .where('id')
        .anyOf(remoteIds)
        .toArray();

      const { toInsert, toUpdate } = mergePulledEvents(
        localEvents,
        response.records,
      );

      // Bulk insert new records
      if (toInsert.length > 0) {
        await db.calendarEvents.bulkAdd(toInsert);
      }

      // Bulk update existing records
      if (toUpdate.length > 0) {
        await db.calendarEvents.bulkPut(toUpdate);
      }
    }

    cursor = response.cursor;
  } while (cursor !== null);
};

/**
 * Performs a full sync cycle: push local changes then pull remote changes.
 */
export const syncCalendarEvents = async (
  apiClient: SyncApiClient,
  lastSyncedAt: string | null,
): Promise<void> => {
  await pushCalendarEvents(apiClient);
  await pullCalendarEvents(apiClient, lastSyncedAt);
};
