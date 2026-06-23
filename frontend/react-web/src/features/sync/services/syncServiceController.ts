import { syncCalendarEvents, pushCalendarEvents } from '@features/calendar-events/services/calendarEventSync';
import type { SyncApiClient as CalendarSyncApiClient } from '@features/calendar-events/services/calendarEventSync';
import { syncNotificationRecords, pushNotificationRecords } from '@features/notifications/services/notificationSync';
import type { SyncApiClient as NotificationSyncApiClient } from '@features/notifications/services/notificationSync';
import { syncAnnualHoursConfig, pushAnnualHoursConfig } from '@features/reports/services/annualHoursConfigSync';
import type { AnnualHoursConfigSyncApiClient } from '@features/reports/services/annualHoursConfigSync';
import { useSyncStore } from '@features/sync/stores/syncStore';

import { db } from '@/data/db';

/** Shape of a shift record for the sync push/pull API. */
interface ShiftSyncRecord {
  id: string;
  name: string;
  icon: string;
  backgroundColor: string;
  startTime: number;
  endTime: number;
  hoursWorked: number;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
  isDeleted: boolean;
}

/** Shape of a reminder record for the sync push/pull API. */
interface ReminderSyncRecord {
  id: string;
  name: string;
  icon: string;
  backgroundColor: string;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
  isDeleted: boolean;
}

/**
 * Sync interval: 5 minutes in milliseconds.
 */
const SYNC_INTERVAL_MS = 300_000;

let unsubscribe: (() => void) | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let isSyncRunning = false;

/**
 * Creates a CalendarEvent sync API client from the given server URL and API key.
 */
const createCalendarApiClient = (serverUrl: string, apiKey: string): CalendarSyncApiClient => ({
  pushCalendarEvents: async (records) => {
    const response = await fetch(`${serverUrl}/api/calendar-events/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Push calendar events failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    return wrapper.data ?? { acknowledgedIds: [], rejectedIds: [] };
  },

  pullCalendarEvents: async (lastSyncedAt, cursor) => {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}/api/calendar-events/sync/pull?${queryString}`
      : `${serverUrl}/api/calendar-events/sync/pull`;
    const response = await fetch(pullUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Pull calendar events failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    return wrapper.data ?? { records: [], cursor: null };
  },
});

/**
 * Creates a NotificationRecord sync API client from the given server URL and API key.
 */
const createNotificationApiClient = (serverUrl: string, apiKey: string): NotificationSyncApiClient => ({
  pushNotificationRecords: async (records) => {
    const response = await fetch(`${serverUrl}/api/notification-records/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Push notification records failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    return wrapper.data ?? { acknowledgedIds: [], rejectedIds: [] };
  },

  pullNotificationRecords: async (lastSyncedAt, cursor) => {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}/api/notification-records/sync/pull?${queryString}`
      : `${serverUrl}/api/notification-records/sync/pull`;
    const response = await fetch(pullUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Pull notification records failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    return wrapper.data ?? { records: [], cursor: null };
  },
});

/**
 * Creates an AnnualHoursConfig sync API client from the given server URL and API key.
 */
const createAnnualHoursApiClient = (serverUrl: string, apiKey: string): AnnualHoursConfigSyncApiClient => ({
  pushAnnualHoursConfig: async (records) => {
    const response = await fetch(`${serverUrl}/api/annual-hours-config/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Push annual hours config failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    return wrapper.data ?? { processedCount: 0 };
  },

  pullAnnualHoursConfig: async (lastSyncedAt, cursor) => {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}/api/annual-hours-config/sync/pull?${queryString}`
      : `${serverUrl}/api/annual-hours-config/sync/pull`;
    const response = await fetch(pullUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Pull annual hours config failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    return wrapper.data ?? { records: [], nextCursor: null };
  },
});

/**
 * Maximum number of records per push batch (sync strategy rule).
 */
const PUSH_BATCH_SIZE = 100;

/**
 * Syncs shifts with the backend (push unsynced + pull remote changes).
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const syncShifts = async (serverUrl: string, apiKey: string, lastSyncedAt: string | null): Promise<void> => {
  await pushShifts(serverUrl, apiKey);

  // Pull
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}/api/shifts/sync/pull?${queryString}`
      : `${serverUrl}/api/shifts/sync/pull`;

    const response = await fetch(pullUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Pull shifts failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    const data = wrapper.data ?? { shifts: [], cursor: null, hasMore: false };

    if (data.shifts && data.shifts.length > 0) {
      const now = new Date();
      for (const remote of data.shifts as ShiftSyncRecord[]) {
        const local = await db.shifts.get(remote.id);
        const remoteShift = {
          id: remote.id,
          name: remote.name,
          icon: remote.icon,
          backgroundColor: remote.backgroundColor,
          startTime: remote.startTime,
          endTime: remote.endTime,
          hoursWorked: remote.hoursWorked,
          isActive: remote.isActive,
          createdAt: new Date(remote.createdAt),
          modifiedAt: new Date(remote.modifiedAt),
          syncedAt: now,
          isDeleted: remote.isDeleted,
        };

        if (!local) {
          await db.shifts.add(remoteShift);
        } else if (local.syncedAt && local.modifiedAt.getTime() <= local.syncedAt.getTime()) {
          // Local has no unsynced changes — accept remote
          await db.shifts.put(remoteShift);
        } else {
          // LWW: remote wins on tie
          if (new Date(remote.modifiedAt).getTime() >= local.modifiedAt.getTime()) {
            await db.shifts.put(remoteShift);
          }
        }
      }
    }

    cursor = data.cursor ?? null;
  } while (cursor !== null);
};

/**
 * Pushes unsynced shifts to the backend.
 */
const pushShifts = async (serverUrl: string, apiKey: string): Promise<void> => {
  const allShifts = await db.shifts.toArray();
  const pushCandidates = allShifts.filter(
    s => s.syncedAt === null || s.modifiedAt.getTime() > s.syncedAt.getTime(),
  );

  if (pushCandidates.length === 0) return;

  for (let i = 0; i < pushCandidates.length; i += PUSH_BATCH_SIZE) {
    const batch = pushCandidates.slice(i, i + PUSH_BATCH_SIZE);
    const shifts: ShiftSyncRecord[] = batch.map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      backgroundColor: s.backgroundColor,
      startTime: s.startTime,
      endTime: s.endTime,
      hoursWorked: s.hoursWorked,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      modifiedAt: s.modifiedAt.toISOString(),
      isDeleted: s.isDeleted,
    }));

    const response = await fetch(`${serverUrl}/api/shifts/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ shifts }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Push shifts failed: ${response.status} - ${errorBody}`);
    }

    // Mark batch as synced
    const now = new Date();
    const ids = batch.map(s => s.id);
    await db.shifts.where('id').anyOf(ids).modify({ syncedAt: now });
  }
};

/**
 * Syncs reminders with the backend (push unsynced + pull remote changes).
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const syncReminders = async (serverUrl: string, apiKey: string, lastSyncedAt: string | null): Promise<void> => {
  await pushReminders(serverUrl, apiKey);

  // Pull
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}/api/reminders/sync/pull?${queryString}`
      : `${serverUrl}/api/reminders/sync/pull`;

    const response = await fetch(pullUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Pull reminders failed: ${response.status} - ${errorBody}`);
    }

    const wrapper = await response.json();
    const data = wrapper.data ?? { records: [], cursor: null, hasMore: false };

    if (data.records && data.records.length > 0) {
      const now = new Date();
      for (const remote of data.records as ReminderSyncRecord[]) {
        const local = await db.reminders.get(remote.id);
        const remoteReminder = {
          id: remote.id,
          name: remote.name,
          icon: remote.icon,
          backgroundColor: remote.backgroundColor,
          isActive: remote.isActive,
          createdAt: new Date(remote.createdAt),
          modifiedAt: new Date(remote.modifiedAt),
          syncedAt: now,
          isDeleted: remote.isDeleted,
        };

        if (!local) {
          await db.reminders.add(remoteReminder);
        } else if (local.syncedAt && local.modifiedAt.getTime() <= local.syncedAt.getTime()) {
          // Local has no unsynced changes — accept remote
          await db.reminders.put(remoteReminder);
        } else {
          // LWW: remote wins on tie
          if (new Date(remote.modifiedAt).getTime() >= local.modifiedAt.getTime()) {
            await db.reminders.put(remoteReminder);
          }
        }
      }
    }

    cursor = data.cursor ?? null;
  } while (cursor !== null);
};

/**
 * Pushes unsynced reminders to the backend.
 */
const pushReminders = async (serverUrl: string, apiKey: string): Promise<void> => {
  const allReminders = await db.reminders.toArray();
  const pushCandidates = allReminders.filter(
    r => r.syncedAt === null || r.modifiedAt.getTime() > r.syncedAt.getTime(),
  );

  if (pushCandidates.length === 0) return;

  for (let i = 0; i < pushCandidates.length; i += PUSH_BATCH_SIZE) {
    const batch = pushCandidates.slice(i, i + PUSH_BATCH_SIZE);
    const records: ReminderSyncRecord[] = batch.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      backgroundColor: r.backgroundColor,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      modifiedAt: r.modifiedAt.toISOString(),
      isDeleted: r.isDeleted,
    }));

    const response = await fetch(`${serverUrl}/api/reminders/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Push reminders failed: ${response.status} - ${errorBody}`);
    }

    // Mark batch as synced
    const now = new Date();
    const ids = batch.map(r => r.id);
    await db.reminders.where('id').anyOf(ids).modify({ syncedAt: now });
  }
};

/**
 * Runs a full sync cycle (push + pull) for all entities.
 * Each entity syncs independently — one failure doesn't block the others.
 * Updates lastSyncedAt always; sets connectionStatus to 'failing' if any entity errored.
 */
export const runFullSyncCycle = async (): Promise<void> => {
  const { config, lastSyncedAt } = useSyncStore.getState();
  if (!config || config.isPaused) return;
  if (isSyncRunning) return;

  isSyncRunning = true;

  // Use epoch date when lastSyncedAt is null (first sync) to ensure all records are pulled
  const effectiveLastSyncedAt = lastSyncedAt ?? '1970-01-01T00:00:00.000Z';

  const { serverUrl, apiKey } = config;
  const calendarClient = createCalendarApiClient(serverUrl, apiKey);
  const notificationClient = createNotificationApiClient(serverUrl, apiKey);
  const annualHoursClient = createAnnualHoursApiClient(serverUrl, apiKey);

  let hasError = false;

  try { await syncCalendarEvents(calendarClient, effectiveLastSyncedAt); } catch { hasError = true; }
  try { await syncNotificationRecords(notificationClient, effectiveLastSyncedAt); } catch { hasError = true; }
  try { await syncAnnualHoursConfig(annualHoursClient, effectiveLastSyncedAt); } catch { hasError = true; }
  try { await syncShifts(serverUrl, apiKey, effectiveLastSyncedAt); } catch { hasError = true; }
  try { await syncReminders(serverUrl, apiKey, effectiveLastSyncedAt); } catch { hasError = true; }

  // Always update lastSyncedAt after every cycle execution, regardless of errors
  try {
    const now = new Date().toISOString();
    useSyncStore.getState().setLastSyncedAt(now);
    await db.syncConfig.update('default', { lastSyncedAt: now });
  } catch {
    // Silent — store update is best-effort
  }

  if (hasError) {
    useSyncStore.getState().setConnectionStatus('failing');
  } else {
    useSyncStore.getState().setConnectionStatus('active');
  }

  isSyncRunning = false;
};

/**
 * Runs a push-only cycle for all entities.
 * Used when the app loses focus to flush local changes.
 * Each entity pushes independently — one failure doesn't block the others.
 */
export const runPushOnlyCycle = async (): Promise<void> => {
  const { config } = useSyncStore.getState();
  if (!config || config.isPaused) return;

  const { serverUrl, apiKey } = config;
  const calendarClient = createCalendarApiClient(serverUrl, apiKey);
  const notificationClient = createNotificationApiClient(serverUrl, apiKey);
  const annualHoursClient = createAnnualHoursApiClient(serverUrl, apiKey);

  try { await pushCalendarEvents(calendarClient); } catch (e) { console.error('Push calendar events failed:', e); }
  try { await pushNotificationRecords(notificationClient); } catch (e) { console.error('Push notification records failed:', e); }
  try { await pushAnnualHoursConfig(annualHoursClient); } catch (e) { console.error('Push annual hours config failed:', e); }
  try { await pushShifts(serverUrl, apiKey); } catch (e) { console.error('Push shifts failed:', e); }
  try { await pushReminders(serverUrl, apiKey); } catch (e) { console.error('Push reminders failed:', e); }
};

/**
 * Handles visibility change events.
 * On visible: run full sync. On hidden: run push-only.
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    void runFullSyncCycle();
  } else {
    void runPushOnlyCycle();
  }
};

/**
 * Starts the sync service controller.
 * Monitors syncStore state and controls the sync worker lifecycle.
 * Call on app initialization.
 */
export const startSyncController = () => {
  if (unsubscribe) return;

  unsubscribe = useSyncStore.subscribe((state, prevState) => {
    if (state.isPaused !== prevState.isPaused || state.config !== prevState.config) {
      if (state.isPaused || !state.config) {
        stopSyncWorker();
      } else {
        resumeSyncWorker();
      }
    }
  });

  // Check current state and start sync if config is already present and not paused
  const { config, isPaused } = useSyncStore.getState();
  if (config && !isPaused) {
    resumeSyncWorker();
  }
};

/**
 * Stops the sync service controller.
 * Call on app teardown.
 */
export const stopSyncController = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  stopSyncWorker();
};

/**
 * Stops the periodic sync worker and removes visibility listener.
 */
export const stopSyncWorker = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
};

/**
 * Starts the periodic sync worker: runs an immediate full sync,
 * then starts a 5-minute interval, and listens for visibility changes.
 */
export const resumeSyncWorker = () => {
  // Don't restart if already running
  if (intervalId !== null) return;

  // Run an immediate sync cycle
  void runFullSyncCycle();

  // Start the periodic timer
  intervalId = setInterval(() => {
    void runFullSyncCycle();
  }, SYNC_INTERVAL_MS);

  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);
};

/**
 * Returns whether sync operations are permitted based on current state.
 * Used by sync workers to check before executing push/pull.
 */
export const isSyncAllowed = (): boolean => {
  const { config, isPaused } = useSyncStore.getState();
  return config !== null && !isPaused;
};
