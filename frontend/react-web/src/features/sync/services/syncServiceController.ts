import { syncCalendarEvents, pushCalendarEvents } from '@features/calendar-events/services/calendarEventSync';
import type { SyncApiClient as CalendarSyncApiClient } from '@features/calendar-events/services/calendarEventSync';
import { syncNotificationRecords, pushNotificationRecords } from '@features/notifications/services/notificationSync';
import type { SyncApiClient as NotificationSyncApiClient } from '@features/notifications/services/notificationSync';
import { syncAnnualHoursConfig, pushAnnualHoursConfig } from '@features/reports/services/annualHoursConfigSync';
import type { AnnualHoursConfigSyncApiClient } from '@features/reports/services/annualHoursConfigSync';
import { purgePastNotifications } from '@features/sync/services/notificationPurgeService';
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
  seriesFrequency: string;
  seriesEndDate: string | null;
  createdAt: string;
  modifiedAt: string;
  isDeleted: boolean;
}

/** Shape of a shift mode setting record for the sync push/pull API. */
interface ShiftModeSettingSyncRecord {
  id: string;
  enabled: boolean;
  modifiedAt: string;
  isDeleted: boolean;
}

/**
 * Default sync interval in minutes when no config is available.
 */
const DEFAULT_SYNC_INTERVAL_MINUTES = 5;

/**
 * Computes the sync interval in milliseconds from the configured minutes value.
 * Falls back to 5 minutes (300000ms) if no config or invalid value.
 */
const getSyncIntervalMs = (): number => {
  const { syncIntervalMinutes } = useSyncStore.getState();
  const minutes = syncIntervalMinutes ?? DEFAULT_SYNC_INTERVAL_MINUTES;
  return minutes * 60 * 1000;
};

let unsubscribe: (() => void) | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let isSyncRunning = false;

/**
 * Creates a CalendarEvent sync API client from the given server URL, API key, and base path.
 */
const createCalendarApiClient = (serverUrl: string, apiKey: string, apiBasePath: string): CalendarSyncApiClient => ({
  pushCalendarEvents: async (records) => {
    const response = await fetch(`${serverUrl}${apiBasePath}/calendar-events/sync/push`, {
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
      ? `${serverUrl}${apiBasePath}/calendar-events/sync/pull?${queryString}`
      : `${serverUrl}${apiBasePath}/calendar-events/sync/pull`;
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
 * Creates a NotificationRecord sync API client from the given server URL, API key, and base path.
 */
const createNotificationApiClient = (serverUrl: string, apiKey: string, apiBasePath: string): NotificationSyncApiClient => ({
  pushNotificationRecords: async (records) => {
    const response = await fetch(`${serverUrl}${apiBasePath}/notification-records/sync/push`, {
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
      ? `${serverUrl}${apiBasePath}/notification-records/sync/pull?${queryString}`
      : `${serverUrl}${apiBasePath}/notification-records/sync/pull`;
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
 * Creates an AnnualHoursConfig sync API client from the given server URL, API key, and base path.
 */
const createAnnualHoursApiClient = (serverUrl: string, apiKey: string, apiBasePath: string): AnnualHoursConfigSyncApiClient => ({
  pushAnnualHoursConfig: async (records) => {
    const response = await fetch(`${serverUrl}${apiBasePath}/annual-hours-config/sync/push`, {
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
      ? `${serverUrl}${apiBasePath}/annual-hours-config/sync/pull?${queryString}`
      : `${serverUrl}${apiBasePath}/annual-hours-config/sync/pull`;
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
const syncShifts = async (serverUrl: string, apiKey: string, apiBasePath: string, lastSyncedAt: string | null): Promise<void> => {
  await pushShifts(serverUrl, apiKey, apiBasePath);

  // Pull
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}${apiBasePath}/shifts/sync/pull?${queryString}`
      : `${serverUrl}${apiBasePath}/shifts/sync/pull`;

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
const pushShifts = async (serverUrl: string, apiKey: string, apiBasePath: string): Promise<void> => {
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

    const response = await fetch(`${serverUrl}${apiBasePath}/shifts/sync/push`, {
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
const syncReminders = async (serverUrl: string, apiKey: string, apiBasePath: string, lastSyncedAt: string | null): Promise<void> => {
  await pushReminders(serverUrl, apiKey, apiBasePath);

  // Pull
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams();
    if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
    if (cursor) params.set('cursor', cursor);

    const queryString = params.toString();
    const pullUrl = queryString
      ? `${serverUrl}${apiBasePath}/reminders/sync/pull?${queryString}`
      : `${serverUrl}${apiBasePath}/reminders/sync/pull`;

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
          seriesFrequency: (remote.seriesFrequency || 'never') as 'never' | 'weekly' | 'monthly' | 'yearly',
          seriesEndDate: remote.seriesEndDate ?? null,
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
const pushReminders = async (serverUrl: string, apiKey: string, apiBasePath: string): Promise<void> => {
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
      seriesFrequency: r.seriesFrequency,
      seriesEndDate: r.seriesEndDate ?? null,
      createdAt: r.createdAt.toISOString(),
      modifiedAt: r.modifiedAt.toISOString(),
      isDeleted: r.isDeleted,
    }));

    const response = await fetch(`${serverUrl}${apiBasePath}/reminders/sync/push`, {
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
 * Normalizes a DateTime ISO string from the backend.
 * The backend serializes DateTime without timezone indicator (e.g., "2026-06-20T13:07:59.878").
 * This function appends `Z` if no timezone indicator is present.
 */
export const normalizeIso = (iso: string): string => {
  if (iso.endsWith('Z') || iso.includes('+') || iso.indexOf('-', 10) >= 0) return iso;
  return `${iso}Z`;
};

/**
 * Merges a single remote shift mode setting record into local storage using LWW.
 */
const mergeShiftModeSettingRecord = async (
  remote: ShiftModeSettingSyncRecord,
  now: Date,
): Promise<void> => {
  const remoteModifiedAt = new Date(normalizeIso(remote.modifiedAt));
  const local = await db.shiftModeSettings.get(remote.id);
  const remoteSetting = {
    id: remote.id,
    enabled: remote.enabled,
    modifiedAt: remoteModifiedAt,
    syncedAt: now,
    isDeleted: remote.isDeleted,
  };

  if (!local) {
    await db.shiftModeSettings.add(remoteSetting);
    return;
  }

  if (local.syncedAt && local.modifiedAt.getTime() <= local.syncedAt.getTime()) {
    await db.shiftModeSettings.put(remoteSetting);
    return;
  }

  if (remoteModifiedAt.getTime() > local.modifiedAt.getTime()) {
    await db.shiftModeSettings.put(remoteSetting);
  }
};

/**
 * Fetches a single page of shift mode settings from the pull endpoint.
 */
const pullShiftModeSettingsPage = async (
  serverUrl: string,
  apiKey: string,
  apiBasePath: string,
  lastSyncedAt: string | null,
  cursor: string | null,
): Promise<{ records: ShiftModeSettingSyncRecord[]; nextCursor: string | null }> => {
  const params = new URLSearchParams();
  if (lastSyncedAt) params.set('lastSyncedAt', lastSyncedAt);
  if (cursor) params.set('cursor', cursor);

  const queryString = params.toString();
  const pullUrl = queryString
    ? `${serverUrl}${apiBasePath}/shift-mode-settings/sync/pull?${queryString}`
    : `${serverUrl}${apiBasePath}/shift-mode-settings/sync/pull`;

  const response = await fetch(pullUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Pull shift mode settings failed: ${response.status} - ${errorBody}`);
  }

  const wrapper = await response.json();
  const data = wrapper.data ?? { records: [], cursor: null, hasMore: false };
  const nextCursor = data.hasMore ? (data.cursor ?? null) : null;
  return { records: data.records ?? [], nextCursor };
};

/**
 * Syncs shift mode settings with the backend (push unsynced + pull remote changes).
 * At most 1 record exists per device.
 */
const syncShiftModeSettings = async (serverUrl: string, apiKey: string, apiBasePath: string, lastSyncedAt: string | null): Promise<void> => {
  await pushShiftModeSettings(serverUrl, apiKey, apiBasePath);

  // Pull
  let cursor: string | null = null;
  do {
    const page = await pullShiftModeSettingsPage(serverUrl, apiKey, apiBasePath, lastSyncedAt, cursor);

    if (page.records.length > 0) {
      const now = new Date();
      for (const remote of page.records) {
        await mergeShiftModeSettingRecord(remote, now);
      }
    }

    cursor = page.nextCursor;
  } while (cursor !== null);
};

/**
 * Pushes unsynced shift mode settings to the backend.
 * At most 1 record will be pushed.
 */
const pushShiftModeSettings = async (serverUrl: string, apiKey: string, apiBasePath: string): Promise<void> => {
  const allSettings = await db.shiftModeSettings.toArray();
  const pushCandidates = allSettings.filter(
    s => s.syncedAt === null || s.modifiedAt.getTime() > s.syncedAt.getTime(),
  );

  if (pushCandidates.length === 0) return;

  const records: ShiftModeSettingSyncRecord[] = pushCandidates.map(s => ({
    id: s.id,
    enabled: s.enabled,
    modifiedAt: s.modifiedAt.toISOString(),
    isDeleted: s.isDeleted,
  }));

  const response = await fetch(`${serverUrl}${apiBasePath}/shift-mode-settings/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Push shift mode settings failed: ${response.status} - ${errorBody}`);
  }

  // Mark as synced
  const now = new Date();
  const ids = pushCandidates.map(s => s.id);
  await db.shiftModeSettings.where('id').anyOf(ids).modify({ syncedAt: now });
};

/**
 * Runs a full sync cycle (push + pull) for all entities.
 * Each entity syncs independently — one failure doesn't block the others.
 * Updates lastSyncedAt only if at least one entity sync succeeds.
 * Sets connectionStatus to 'failing' if any entity errored.
 */
export const runFullSyncCycle = async (): Promise<void> => {
  const { config, lastSyncedAt } = useSyncStore.getState();
  if (!config || config.isPaused) return;
  if (isSyncRunning) return;

  isSyncRunning = true;

  // Use epoch date when lastSyncedAt is null (first sync) to ensure all records are pulled
  const effectiveLastSyncedAt = lastSyncedAt ?? '1970-01-01T00:00:00.000Z';

  const { serverUrl, apiKey, apiBasePath } = config;
  const calendarClient = createCalendarApiClient(serverUrl, apiKey, apiBasePath);
  const notificationClient = createNotificationApiClient(serverUrl, apiKey, apiBasePath);
  const annualHoursClient = createAnnualHoursApiClient(serverUrl, apiKey, apiBasePath);

  let hasError = false;
  let hasAnySuccess = false;

  try { await syncCalendarEvents(calendarClient, effectiveLastSyncedAt); hasAnySuccess = true; } catch { hasError = true; }
  try { await syncNotificationRecords(notificationClient, effectiveLastSyncedAt); hasAnySuccess = true; } catch { hasError = true; }
  try { await syncAnnualHoursConfig(annualHoursClient, effectiveLastSyncedAt); hasAnySuccess = true; } catch { hasError = true; }
  try { await syncShifts(serverUrl, apiKey, apiBasePath, effectiveLastSyncedAt); hasAnySuccess = true; } catch { hasError = true; }
  try { await syncReminders(serverUrl, apiKey, apiBasePath, effectiveLastSyncedAt); hasAnySuccess = true; } catch { hasError = true; }
  try { await syncShiftModeSettings(serverUrl, apiKey, apiBasePath, effectiveLastSyncedAt); hasAnySuccess = true; } catch { hasError = true; }

  // Post-cycle notification purge — fire and forget, does not affect sync status
  try {
    await purgePastNotifications();
  } catch (err) {
    console.error('Post-cycle notification purge failed:', err);
  }

  // Only update lastSyncedAt if at least one entity sync succeeded
  if (hasAnySuccess) {
    try {
      const now = new Date().toISOString();
      useSyncStore.getState().setLastSyncedAt(now);
      await db.syncConfig.update('default', { lastSyncedAt: now });
    } catch {
      // Silent — store update is best-effort
    }
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

  const { serverUrl, apiKey, apiBasePath } = config;
  const calendarClient = createCalendarApiClient(serverUrl, apiKey, apiBasePath);
  const notificationClient = createNotificationApiClient(serverUrl, apiKey, apiBasePath);
  const annualHoursClient = createAnnualHoursApiClient(serverUrl, apiKey, apiBasePath);

  try { await pushCalendarEvents(calendarClient); } catch (e) { console.error('Push calendar events failed:', e); }
  try { await pushNotificationRecords(notificationClient); } catch (e) { console.error('Push notification records failed:', e); }
  try { await pushAnnualHoursConfig(annualHoursClient); } catch (e) { console.error('Push annual hours config failed:', e); }
  try { await pushShifts(serverUrl, apiKey, apiBasePath); } catch (e) { console.error('Push shifts failed:', e); }
  try { await pushReminders(serverUrl, apiKey, apiBasePath); } catch (e) { console.error('Push reminders failed:', e); }
  try { await pushShiftModeSettings(serverUrl, apiKey, apiBasePath); } catch (e) { console.error('Push shift mode settings failed:', e); }
};

/**
 * Handles visibility change events.
 * On visible: run full sync (guarded by isPaused inside runFullSyncCycle).
 * On hidden: run push-only (guarded by isPaused inside runPushOnlyCycle).
 */
const handleVisibilityChange = () => {
  const { isPaused } = useSyncStore.getState();
  if (isPaused) return;

  if (document.visibilityState === 'visible') {
    void runFullSyncCycle();
  } else {
    void runPushOnlyCycle();
  }
};

/**
 * Handles connectivity restore events (browser 'online' event).
 * Triggers a full sync cycle when network comes back — guarded by isPaused.
 */
const handleOnline = () => {
  const { isPaused, config } = useSyncStore.getState();
  if (isPaused || !config) return;

  void runFullSyncCycle();
};

/**
 * Starts the sync service controller.
 * Monitors syncStore state and controls the sync worker lifecycle.
 * Detects interval changes and restarts the timer with the new value.
 * Call on app initialization.
 */
export const startSyncController = () => {
  if (unsubscribe) return;

  unsubscribe = useSyncStore.subscribe((state, prevState) => {
    const pauseOrConfigChanged = state.isPaused !== prevState.isPaused || state.config !== prevState.config;
    const intervalChanged = state.syncIntervalMinutes !== prevState.syncIntervalMinutes;

    if (pauseOrConfigChanged || intervalChanged) {
      if (state.isPaused || !state.config) {
        stopSyncWorker();
      } else if (intervalChanged && intervalId !== null) {
        // Interval changed while running — restart with new interval
        restartSyncInterval();
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
 * Stops the periodic sync worker and removes visibility/connectivity listeners.
 */
export const stopSyncWorker = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleOnline);
};

/**
 * Restarts the periodic sync interval with the current config-driven value.
 * Called when the sync interval is modified while the worker is already running.
 * Does NOT run an immediate sync cycle — only adjusts the timer.
 */
const restartSyncInterval = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  const intervalMs = getSyncIntervalMs();
  intervalId = setInterval(() => {
    void runFullSyncCycle();
  }, intervalMs);
};

/**
 * Starts the periodic sync worker: runs an immediate full sync,
 * then starts an interval based on the configured sync interval,
 * listens for visibility changes, and listens for connectivity restore.
 */
export const resumeSyncWorker = () => {
  // Don't restart if already running
  if (intervalId !== null) return;

  // Run an immediate sync cycle
  void runFullSyncCycle();

  // Start the periodic timer with config-driven interval
  const intervalMs = getSyncIntervalMs();
  intervalId = setInterval(() => {
    void runFullSyncCycle();
  }, intervalMs);

  // Listen for visibility changes (app focus/blur)
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Listen for connectivity restore (network comes back online)
  window.addEventListener('online', handleOnline);
};

/**
 * Returns whether sync operations are permitted based on current state.
 * Used by sync workers to check before executing push/pull.
 */
export const isSyncAllowed = (): boolean => {
  const { config, isPaused } = useSyncStore.getState();
  return config !== null && !isPaused;
};

/**
 * Triggers a manual sync cycle.
 * Returns false if sync is paused or not configured (manual trigger rejected).
 * Returns true if sync was initiated.
 */
export const triggerManualSync = (): boolean => {
  const { config, isPaused } = useSyncStore.getState();
  if (!config || isPaused) return false;

  void runFullSyncCycle();
  return true;
};
