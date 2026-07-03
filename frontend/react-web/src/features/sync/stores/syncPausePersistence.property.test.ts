/**
 * Property-based tests for sync pause persistence (Properties 1–4).
 * Feature: gh32-improvements-and-bug-fixes
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 *
 * Uses fast-check with minimum 100 iterations per property.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

import { db } from '@/data/db';
import type { SyncConfig } from '@features/sync/models';
import {
  isSyncAllowed,
  triggerManualSync,
  runFullSyncCycle,
} from '@features/sync/services/syncServiceController';

import { useSyncStore } from './syncStore';

// Mock sync modules to avoid real network calls
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

/**
 * Sync trigger types that could fire during app lifecycle.
 */
type SyncTriggerType = 'periodic' | 'visibility-visible' | 'visibility-hidden' | 'connectivity-restore' | 'manual';

/**
 * Arbitrary for generating sync trigger types.
 */
const syncTriggerArb = fc.constantFrom<SyncTriggerType>(
  'periodic',
  'visibility-visible',
  'visibility-hidden',
  'connectivity-restore',
  'manual',
);

/**
 * Arbitrary for generating valid lastSyncedAt ISO strings.
 */
const lastSyncedAtArb = fc.option(
  fc.integer({ min: 1577836800000, max: 1893456000000 }).map((ms) => new Date(ms).toISOString()),
  { nil: null },
);

/**
 * Arbitrary for generating valid SyncConfig instances (without isPaused — tests control that).
 */
const syncConfigArb = fc.record({
  serverUrl: fc.constantFrom(
    'https://backend.planixor.com',
    'http://localhost:5000',
    'https://api.example.org',
    'https://sync.myserver.io:8443',
  ),
  apiKey: fc.string({ minLength: 8, maxLength: 32 }).filter((s) => s.trim().length >= 8),
  username: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
  apiBasePath: fc.constantFrom('/api', '/custom/v2', '/v3/services', '/backend/api'),
  syncIntervalMinutes: fc.constantFrom(5, 10, 15, 20, 25, 30, 45, 60),
  lastSyncedAt: lastSyncedAtArb,
});

describe('syncPausePersistence — property tests', () => {
  beforeEach(async () => {
    await db.syncConfig.clear();
    useSyncStore.setState({
      config: null,
      connectionStatus: 'unconfigured',
      isPaused: false,
      lastSyncedAt: null,
      apiBasePath: '/api',
      syncIntervalMinutes: 5,
    });
  });

  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 1: Sync pause blocks all operations
   *
   * For any sync trigger type and isPaused=true, verify no push/pull executes.
   * We verify this by checking isSyncAllowed() returns false and that
   * runFullSyncCycle returns immediately without making fetch calls.
   *
   * **Validates: Requirements 4.2, 4.3**
   */
  describe('Property 1: Sync pause blocks all operations', () => {
    it('for any trigger type and isPaused=true, isSyncAllowed is false and manual sync is rejected', () => {
      fc.assert(
        fc.property(syncTriggerArb, syncConfigArb, (triggerType, configData) => {
          const config: SyncConfig = { ...configData, isPaused: true, key: 'default' };
          useSyncStore.setState({
            config,
            connectionStatus: 'paused',
            isPaused: true,
            lastSyncedAt: configData.lastSyncedAt,
            apiBasePath: configData.apiBasePath,
            syncIntervalMinutes: configData.syncIntervalMinutes,
          });

          // isSyncAllowed is the guard used by all sync trigger paths
          expect(isSyncAllowed()).toBe(false);

          // Manual sync specifically should return false
          if (triggerType === 'manual') {
            expect(triggerManualSync()).toBe(false);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('runFullSyncCycle returns immediately without fetch when paused', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 200 }),
      );

      await fc.assert(
        fc.asyncProperty(syncConfigArb, async (configData) => {
          fetchSpy.mockClear();

          const config: SyncConfig = { ...configData, isPaused: true, key: 'default' };
          useSyncStore.setState({
            config,
            connectionStatus: 'paused',
            isPaused: true,
            lastSyncedAt: configData.lastSyncedAt,
            apiBasePath: configData.apiBasePath,
            syncIntervalMinutes: configData.syncIntervalMinutes,
          });

          await runFullSyncCycle();

          // No fetch calls should have been made
          expect(fetchSpy).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );

      fetchSpy.mockRestore();
    });
  });

  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 2: Sync pause persistence round-trip
   *
   * Pause → reload config → verify isPaused=true and connectionStatus='paused'.
   *
   * **Validates: Requirements 4.1, 4.5**
   */
  describe('Property 2: Sync pause persistence round-trip', () => {
    it('pausing and reloading config restores isPaused=true and connectionStatus=paused', async () => {
      await fc.assert(
        fc.asyncProperty(syncConfigArb, async (configData) => {
          // Start with active config persisted in DB
          const config: SyncConfig = { ...configData, isPaused: false, key: 'default' };
          await db.syncConfig.clear();
          await db.syncConfig.put(config);
          useSyncStore.setState({
            config,
            connectionStatus: 'active',
            isPaused: false,
            lastSyncedAt: configData.lastSyncedAt,
            apiBasePath: configData.apiBasePath,
            syncIntervalMinutes: configData.syncIntervalMinutes,
          });

          // Pause
          await useSyncStore.getState().pause();

          // Verify in-memory state after pause
          expect(useSyncStore.getState().isPaused).toBe(true);
          expect(useSyncStore.getState().connectionStatus).toBe('paused');

          // Simulate app restart: reset in-memory state
          useSyncStore.setState({
            config: null,
            connectionStatus: 'unconfigured',
            isPaused: false,
            lastSyncedAt: null,
            apiBasePath: '/api',
            syncIntervalMinutes: 5,
          });

          // Reload from DB
          await useSyncStore.getState().loadConfig();

          // After reload, paused state should be restored
          const state = useSyncStore.getState();
          expect(state.isPaused).toBe(true);
          expect(state.connectionStatus).toBe('paused');
          expect(state.config?.isPaused).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 3: Unconfigured takes precedence over paused
   *
   * No SyncConfig record → connectionStatus='unconfigured', regardless of prior pause state.
   *
   * **Validates: Requirements 4.6**
   */
  describe('Property 3: Unconfigured takes precedence over paused', () => {
    it('when no SyncConfig record exists, loadConfig always results in unconfigured status', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (wasPreviouslyPaused) => {
          // Set in-memory state as if we were previously paused or active
          useSyncStore.setState({
            config: null,
            connectionStatus: wasPreviouslyPaused ? 'paused' : 'active',
            isPaused: wasPreviouslyPaused,
            lastSyncedAt: null,
            apiBasePath: '/api',
            syncIntervalMinutes: 5,
          });

          // Ensure DB is empty
          await db.syncConfig.clear();

          // Load config
          await useSyncStore.getState().loadConfig();

          // UNCONFIGURED takes precedence over any prior state
          const state = useSyncStore.getState();
          expect(state.connectionStatus).toBe('unconfigured');
          expect(state.isPaused).toBe(false);
          expect(state.config).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('clearConfig always results in unconfigured regardless of isPaused value', async () => {
      await fc.assert(
        fc.asyncProperty(syncConfigArb, fc.boolean(), async (configData, isPaused) => {
          // Set up with some config (paused or active)
          const config: SyncConfig = { ...configData, isPaused, key: 'default' };
          await db.syncConfig.clear();
          await db.syncConfig.put(config);
          useSyncStore.setState({
            config,
            connectionStatus: isPaused ? 'paused' : 'active',
            isPaused,
            lastSyncedAt: configData.lastSyncedAt,
            apiBasePath: configData.apiBasePath,
            syncIntervalMinutes: configData.syncIntervalMinutes,
          });

          // Clear config (simulates Reset Application)
          await useSyncStore.getState().clearConfig();

          // Should always be unconfigured after clearing
          const state = useSyncStore.getState();
          expect(state.connectionStatus).toBe('unconfigured');
          expect(state.isPaused).toBe(false);
          expect(state.config).toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 4: Resume triggers sync and persists active state
   *
   * Resume → verify isPaused=false, connectionStatus='active', sync triggered.
   *
   * **Validates: Requirements 4.4**
   */
  describe('Property 4: Resume triggers sync and persists active state', () => {
    it('resuming from paused state persists isPaused=false and sets connectionStatus=active', async () => {
      await fc.assert(
        fc.asyncProperty(syncConfigArb, async (configData) => {
          // Start with paused config
          const config: SyncConfig = { ...configData, isPaused: true, key: 'default' };
          await db.syncConfig.clear();
          await db.syncConfig.put(config);
          useSyncStore.setState({
            config,
            connectionStatus: 'paused',
            isPaused: true,
            lastSyncedAt: configData.lastSyncedAt,
            apiBasePath: configData.apiBasePath,
            syncIntervalMinutes: configData.syncIntervalMinutes,
          });

          // Resume
          await useSyncStore.getState().resume();

          // Verify in-memory state
          const state = useSyncStore.getState();
          expect(state.isPaused).toBe(false);
          expect(state.connectionStatus).toBe('active');
          expect(state.config?.isPaused).toBe(false);

          // Verify persistence in IndexedDB
          const persisted = await db.syncConfig.get('default');
          expect(persisted?.isPaused).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('after resume, isSyncAllowed returns true (sync can proceed)', async () => {
      await fc.assert(
        fc.asyncProperty(syncConfigArb, async (configData) => {
          // Start paused
          const config: SyncConfig = { ...configData, isPaused: true, key: 'default' };
          await db.syncConfig.clear();
          await db.syncConfig.put(config);
          useSyncStore.setState({
            config,
            connectionStatus: 'paused',
            isPaused: true,
            lastSyncedAt: configData.lastSyncedAt,
            apiBasePath: configData.apiBasePath,
            syncIntervalMinutes: configData.syncIntervalMinutes,
          });

          // Before resume: sync not allowed
          expect(isSyncAllowed()).toBe(false);

          // Resume
          await useSyncStore.getState().resume();

          // After resume: sync is allowed
          expect(isSyncAllowed()).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });
});
