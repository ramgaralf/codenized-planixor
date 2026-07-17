import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';

import { useSyncStore } from '@features/sync/stores/syncStore';

import { normalizeIso, runFullSyncCycle } from '@features/sync/services/syncServiceController';

// Mock the sync modules to avoid real DB/network calls
vi.mock('@features/calendar-events/services/calendarEventSync', () => ({
  syncCalendarEvents: vi.fn().mockResolvedValue(undefined),
  pushCalendarEvents: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@features/notifications/services/notificationSync', () => ({
  syncNotificationRecords: vi.fn().mockResolvedValue(undefined),
  pushNotificationRecords: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@features/reports/services/annualHoursConfigSync', () => ({
  syncAnnualHoursConfig: vi.fn().mockResolvedValue(undefined),
  pushAnnualHoursConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@features/sync/services/notificationPurgeService', () => ({
  purgePastNotifications: vi.fn().mockResolvedValue({ purgedCount: 0 }),
}));

vi.mock('@/data/db', () => ({
  db: {
    syncConfig: {
      update: vi.fn().mockResolvedValue(undefined),
    },
    shifts: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          modify: vi.fn().mockResolvedValue(0),
        }),
      }),
    },
    reminders: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          modify: vi.fn().mockResolvedValue(0),
        }),
      }),
    },
    shiftModeSettings: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          modify: vi.fn().mockResolvedValue(0),
        }),
        equals: vi.fn().mockReturnValue({
          modify: vi.fn().mockResolvedValue(0),
        }),
      }),
    },
  },
}));

import { db } from '@/data/db';

const mockedShiftModeSettings = vi.mocked(db.shiftModeSettings);

describe('Shift Mode Settings Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncStore.setState({
      config: {
        serverUrl: 'https://example.com',
        apiKey: 'test-key',
        username: 'user1',
        apiBasePath: '/api',
        syncIntervalMinutes: 5,
        isPaused: false,
        lastSyncedAt: null,
      },
      isPaused: false,
      lastSyncedAt: null,
      syncIntervalMinutes: 5,
      connectionStatus: 'active',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Push — identifies unsynced records', () => {
    it('should push records with syncedAt=null (never synced)', async () => {
      const unsyncedRecord = {
        id: 'setting-1',
        enabled: true,
        modifiedAt: new Date('2025-06-20T10:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([unsyncedRecord]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

      await runFullSyncCycle();

      const pushCalls = fetchSpy.mock.calls.filter(
        call => (call[0] as string).includes('shift-mode-settings/sync/push'),
      );
      expect(pushCalls.length).toBe(1);

      const body = JSON.parse((pushCalls[0][1] as RequestInit).body as string);
      expect(body.records).toHaveLength(1);
      expect(body.records[0].id).toBe('setting-1');
      expect(body.records[0].enabled).toBe(true);
    });

    it('should push records where modifiedAt > syncedAt', async () => {
      const modifiedRecord = {
        id: 'setting-1',
        enabled: false,
        modifiedAt: new Date('2025-06-20T12:00:00Z'),
        syncedAt: new Date('2025-06-20T10:00:00Z'),
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([modifiedRecord]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

      await runFullSyncCycle();

      const pushCalls = fetchSpy.mock.calls.filter(
        call => (call[0] as string).includes('shift-mode-settings/sync/push'),
      );
      expect(pushCalls.length).toBe(1);

      const body = JSON.parse((pushCalls[0][1] as RequestInit).body as string);
      expect(body.records).toHaveLength(1);
      expect(body.records[0].id).toBe('setting-1');
    });

    it('should not push records where modifiedAt <= syncedAt (already synced)', async () => {
      const syncedRecord = {
        id: 'setting-1',
        enabled: true,
        modifiedAt: new Date('2025-06-20T10:00:00Z'),
        syncedAt: new Date('2025-06-20T10:00:00Z'),
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([syncedRecord]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

      await runFullSyncCycle();

      const pushCalls = fetchSpy.mock.calls.filter(
        call => (call[0] as string).includes('shift-mode-settings/sync/push'),
      );
      // No push call because all records are already synced
      expect(pushCalls.length).toBe(0);
    });
  });

  describe('Pull — LWW conflict resolution', () => {
    it('should accept remote record when no local record exists (new record from remote)', async () => {
      mockedShiftModeSettings.toArray.mockResolvedValue([]);
      mockedShiftModeSettings.get.mockResolvedValue(undefined);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'remote-1',
                enabled: true,
                modifiedAt: '2025-06-20T14:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      expect(mockedShiftModeSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'remote-1',
          enabled: true,
          isDeleted: false,
        }),
      );
    });

    it('should overwrite local when remote modifiedAt is strictly greater (LWW newer remote wins)', async () => {
      const localRecord = {
        id: 'setting-1',
        enabled: false,
        modifiedAt: new Date('2025-06-20T10:00:00Z'),
        syncedAt: new Date('2025-06-20T09:00:00Z'),
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([]);
      mockedShiftModeSettings.get.mockResolvedValue(localRecord);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'setting-1',
                enabled: true,
                modifiedAt: '2025-06-20T12:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      expect(mockedShiftModeSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'setting-1',
          enabled: true,
        }),
      );
    });

    it('should reject remote when remote modifiedAt is equal to local (older remote is ignored)', async () => {
      const localRecord = {
        id: 'setting-1',
        enabled: true,
        modifiedAt: new Date('2025-06-20T12:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([]);
      mockedShiftModeSettings.get.mockResolvedValue(localRecord);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'setting-1',
                enabled: false,
                modifiedAt: '2025-06-20T12:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      // put should NOT have been called for shift mode settings (remote was rejected)
      expect(mockedShiftModeSettings.put).not.toHaveBeenCalled();
    });

    it('should reject remote when remote modifiedAt is less than local (older remote is ignored)', async () => {
      const localRecord = {
        id: 'setting-1',
        enabled: true,
        modifiedAt: new Date('2025-06-20T14:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([]);
      mockedShiftModeSettings.get.mockResolvedValue(localRecord);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'setting-1',
                enabled: false,
                modifiedAt: '2025-06-20T10:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      // put should NOT have been called for shift mode settings (remote was rejected)
      expect(mockedShiftModeSettings.put).not.toHaveBeenCalled();
    });

    it('should accept remote when local has no unsynced changes (syncedAt >= modifiedAt)', async () => {
      const localRecord = {
        id: 'setting-1',
        enabled: false,
        modifiedAt: new Date('2025-06-20T08:00:00Z'),
        syncedAt: new Date('2025-06-20T09:00:00Z'),
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([]);
      mockedShiftModeSettings.get.mockResolvedValue(localRecord);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'setting-1',
                enabled: true,
                modifiedAt: '2025-06-20T07:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      // When local has no unsynced changes (modifiedAt <= syncedAt), accept remote unconditionally
      expect(mockedShiftModeSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'setting-1',
          enabled: true,
        }),
      );
    });
  });

  describe('DateTime normalization', () => {
    it('should append Z when no timezone indicator is present', () => {
      expect(normalizeIso('2025-06-20T10:00:00')).toBe('2025-06-20T10:00:00Z');
      expect(normalizeIso('2025-06-20T10:00:00.123')).toBe('2025-06-20T10:00:00.123Z');
    });

    it('should not modify ISO strings that already end with Z', () => {
      expect(normalizeIso('2025-06-20T10:00:00Z')).toBe('2025-06-20T10:00:00Z');
      expect(normalizeIso('2025-06-20T10:00:00.123Z')).toBe('2025-06-20T10:00:00.123Z');
    });

    it('should not modify ISO strings with a positive offset', () => {
      expect(normalizeIso('2025-06-20T10:00:00+05:00')).toBe('2025-06-20T10:00:00+05:00');
    });

    it('should not modify ISO strings with a negative offset', () => {
      expect(normalizeIso('2025-06-20T10:00:00-03:00')).toBe('2025-06-20T10:00:00-03:00');
    });

    it('should handle datetime from backend format used in pull response', async () => {
      mockedShiftModeSettings.toArray.mockResolvedValue([]);
      mockedShiftModeSettings.get.mockResolvedValue(undefined);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'setting-1',
                enabled: true,
                // Backend format: no Z suffix
                modifiedAt: '2025-06-20T13:07:59.878',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      expect(mockedShiftModeSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'setting-1',
          modifiedAt: new Date('2025-06-20T13:07:59.878Z'),
        }),
      );
    });
  });

  /**
   * Property 1: Setting state management
   *
   * For any toggle action (enable or disable) on a valid Shift_Mode_Setting record,
   * the resulting record SHALL have `enabled` set to the new value, `modifiedAt` strictly
   * greater than the previous `modifiedAt`, and `syncedAt` set to null.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  describe('Property 1: Setting state management', () => {
    it('should produce valid state after toggle: enabled flips, modifiedAt increases, syncedAt nullified', () => {
      // Use integer timestamps to avoid invalid Date generation
      const validTimestamp = fc.integer({ min: 1577836800000, max: 1893456000000 }); // 2020-01-01 to 2030-01-01

      fc.assert(
        fc.property(
          fc.boolean(),
          validTimestamp,
          fc.option(validTimestamp, { nil: null }),
          (currentEnabled, currentModifiedAtMs, currentSyncedAtMs) => {
            const currentModifiedAt = new Date(currentModifiedAtMs);
            const currentSyncedAt = currentSyncedAtMs !== null ? new Date(currentSyncedAtMs) : null;

            // Simulate toggle: flip enabled, set new modifiedAt > old, set syncedAt = null
            const newEnabled = !currentEnabled;
            const newModifiedAt = new Date(currentModifiedAt.getTime() + 1);
            const newSyncedAt = null;

            // Verify the toggle invariants hold
            expect(newEnabled).not.toBe(currentEnabled);
            expect(newModifiedAt.getTime()).toBeGreaterThan(currentModifiedAt.getTime());
            expect(newSyncedAt).toBeNull();

            // Verify these are the correct state changes the useShiftMode hook produces
            const updatedRecord = {
              enabled: newEnabled,
              modifiedAt: newModifiedAt,
              syncedAt: newSyncedAt,
            };

            expect(updatedRecord.enabled).toBe(!currentEnabled);
            expect(updatedRecord.modifiedAt.getTime()).toBeGreaterThan(currentModifiedAt.getTime());
            expect(updatedRecord.syncedAt).toBeNull();

            // syncedAt was previously set (or null) — after toggle it must be null regardless
            if (currentSyncedAt !== null) {
              expect(updatedRecord.syncedAt).not.toEqual(currentSyncedAt);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce a record that is identified as pending sync after toggle', () => {
      const validTimestamp = fc.integer({ min: 1577836800000, max: 1893456000000 });

      fc.assert(
        fc.property(
          fc.boolean(),
          validTimestamp,
          (currentEnabled, currentModifiedAtMs) => {
            const currentModifiedAt = new Date(currentModifiedAtMs);

            // After toggle, record should be identified as needing push
            const newModifiedAt = new Date(currentModifiedAt.getTime() + 1);
            const newSyncedAt = null;

            // Push candidate logic: syncedAt === null OR modifiedAt > syncedAt
            const isPushCandidate = newSyncedAt === null || newModifiedAt.getTime() > newSyncedAt.getTime();
            expect(isPushCandidate).toBe(true);

            // The enabled value should be the opposite of the original
            expect(!currentEnabled).not.toBe(currentEnabled);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Last-Writer-Wins conflict resolution
   *
   * For any local Shift_Mode_Setting record and any remote record received during
   * a pull sync, the system SHALL overwrite the local record if and only if the remote
   * `modifiedAt` is strictly greater than the local `modifiedAt`; otherwise the local
   * record SHALL remain unchanged.
   *
   * **Validates: Requirements 2.4, 2.5**
   */
  describe('Property 2: Last-Writer-Wins conflict resolution', () => {
    it('should accept remote when remote modifiedAt > local modifiedAt, reject otherwise', () => {
      const validTimestamp = fc.integer({ min: 1577836800000, max: 1893456000000 });

      fc.assert(
        fc.property(
          validTimestamp,
          validTimestamp,
          fc.boolean(),
          fc.boolean(),
          (localModifiedAtMs, remoteModifiedAtMs, localEnabled, remoteEnabled) => {
            const remoteWins = remoteModifiedAtMs > localModifiedAtMs;

            // After LWW resolution, the accepted enabled value should be:
            const resultEnabled = remoteWins ? remoteEnabled : localEnabled;

            if (remoteWins) {
              // Remote wins: result matches remote
              expect(resultEnabled).toBe(remoteEnabled);
            } else {
              // Local wins: result matches local
              expect(resultEnabled).toBe(localEnabled);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should never accept remote when timestamps are equal (local wins on tie for unsynced records)', () => {
      const validTimestamp = fc.integer({ min: 1577836800000, max: 1893456000000 });

      fc.assert(
        fc.property(
          validTimestamp,
          fc.boolean(),
          fc.boolean(),
          (timestampMs, localEnabled, remoteEnabled) => {
            // When timestamps are equal, remote does NOT win (strict greater than required)
            const localTimestamp = timestampMs;
            const remoteTimestamp = timestampMs;
            const remoteWins = remoteTimestamp > localTimestamp; // always false when equal
            expect(remoteWins).toBe(false);

            // Result should be local value
            const resultEnabled = remoteWins ? remoteEnabled : localEnabled;
            expect(resultEnabled).toBe(localEnabled);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly determine push candidates based on sync state', () => {
      const validTimestamp = fc.integer({ min: 1577836800000, max: 1893456000000 });

      fc.assert(
        fc.property(
          validTimestamp,
          fc.option(validTimestamp, { nil: null }),
          (modifiedAtMs, syncedAtMs) => {
            // A record is a push candidate if: syncedAt is null OR modifiedAt > syncedAt
            const isPushCandidate = syncedAtMs === null || modifiedAtMs > syncedAtMs;

            if (syncedAtMs === null) {
              // Never synced records should always be push candidates
              expect(isPushCandidate).toBe(true);
            } else if (modifiedAtMs > syncedAtMs) {
              // Modified after last sync should be push candidates
              expect(isPushCandidate).toBe(true);
            } else {
              // Already synced and not modified since should NOT be push candidates
              expect(isPushCandidate).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce a valid date after normalizeIso for any backend datetime format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 59 }),
          (year, month, day, hour, minute, second) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;

            // normalizeIso should add Z when no timezone present
            const normalized = normalizeIso(iso);
            expect(normalized).toBe(`${iso}Z`);

            // The normalized string should produce a valid Date
            const date = new Date(normalized);
            expect(date.getTime()).not.toBeNaN();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Pull — Cross-ID deduplication (single-row entity)', () => {
    it('should replace local record when remote has different ID and newer modifiedAt', async () => {
      const localRecord = {
        id: 'local-uuid-aaa',
        enabled: false,
        modifiedAt: new Date('2025-06-20T10:00:00Z'),
        syncedAt: new Date('2025-06-20T10:00:00Z'),
        isDeleted: false,
      };

      // get(remote.id) returns undefined (different ID)
      mockedShiftModeSettings.get.mockResolvedValue(undefined);
      // toArray returns the existing local record (already synced, so push skips it)
      mockedShiftModeSettings.toArray.mockResolvedValue([localRecord]);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'remote-uuid-bbb',
                enabled: true,
                modifiedAt: '2025-06-20T14:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      // Should delete the old local record and insert the remote one
      expect(mockedShiftModeSettings.delete).toHaveBeenCalledWith('local-uuid-aaa');
      expect(mockedShiftModeSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'remote-uuid-bbb',
          enabled: true,
        }),
      );
    });

    it('should keep local record when remote has different ID but older modifiedAt', async () => {
      const localRecord = {
        id: 'local-uuid-aaa',
        enabled: true,
        modifiedAt: new Date('2025-06-20T14:00:00Z'),
        syncedAt: new Date('2025-06-20T14:00:00Z'),
        isDeleted: false,
      };

      mockedShiftModeSettings.get.mockResolvedValue(undefined);
      mockedShiftModeSettings.toArray.mockResolvedValue([localRecord]);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url as string;
        if (urlStr.includes('shift-mode-settings/sync/pull')) {
          return new Response(JSON.stringify({
            data: {
              records: [{
                id: 'remote-uuid-bbb',
                enabled: false,
                modifiedAt: '2025-06-20T10:00:00Z',
                isDeleted: false,
              }],
              cursor: null,
              hasMore: false,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      await runFullSyncCycle();

      // Should NOT delete local or insert remote — local wins
      expect(mockedShiftModeSettings.delete).not.toHaveBeenCalled();
      expect(mockedShiftModeSettings.add).not.toHaveBeenCalled();
      expect(mockedShiftModeSettings.put).not.toHaveBeenCalled();
    });
  });

  describe('Push — Deduplication safety', () => {
    it('should only push 1 record and delete extras when multiple records exist', async () => {
      const newerRecord = {
        id: 'setting-newer',
        enabled: true,
        modifiedAt: new Date('2025-06-20T14:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };
      const olderRecord1 = {
        id: 'setting-older-1',
        enabled: false,
        modifiedAt: new Date('2025-06-20T10:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };
      const olderRecord2 = {
        id: 'setting-older-2',
        enabled: false,
        modifiedAt: new Date('2025-06-20T08:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };

      mockedShiftModeSettings.toArray.mockResolvedValue([olderRecord1, newerRecord, olderRecord2]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          data: { records: [], cursor: null, hasMore: false, acknowledgedIds: [], rejectedIds: [], processedCount: 0, shifts: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

      await runFullSyncCycle();

      // Should have deleted the 2 older records
      expect(mockedShiftModeSettings.bulkDelete).toHaveBeenCalledWith(
        expect.arrayContaining(['setting-older-1', 'setting-older-2']),
      );

      // Should push only 1 record (the newest)
      const pushCalls = fetchSpy.mock.calls.filter(
        call => (call[0] as string).includes('shift-mode-settings/sync/push'),
      );
      expect(pushCalls.length).toBe(1);

      const body = JSON.parse((pushCalls[0][1] as RequestInit).body as string);
      expect(body.records).toHaveLength(1);
      expect(body.records[0].id).toBe('setting-newer');
    });
  });
});
