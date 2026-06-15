import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '@/data/db';
import { PREDEFINED_PALETTE } from '@features/reminders/constants';

import {
  create,
  getAll,
  update,
  softDelete,
  deactivate,
  getUnsynced,
  applyRemoteRecords,
} from './reminderService';
import {
  getPushCandidates,
  batchForPush,
  mergePulledReminders,
} from './reminderSync';

import type { Reminder } from '@features/reminders/models';
import type { CreateReminderInput } from './reminderService';

/**
 * Integration tests for the Reminder sync flow.
 *
 * These tests verify the end-to-end data flow:
 * Create reminders → modify some → push candidates selected correctly →
 * simulate API response → pull new records → merge resolves conflicts.
 *
 * Validates: Requirements 6.1, 6.4, 6.5
 */
describe('reminderSync — Integration Tests', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.reminders.clear();
  });

  const makeInput = (name: string): CreateReminderInput => ({
    name,
    icon: '🔔',
    backgroundColor: PREDEFINED_PALETTE[0],
  });

  describe('End-to-end push flow', () => {
    it('should identify all newly created reminders as push candidates', async () => {
      // Create multiple reminders (all new, never synced)
      const r1 = await create(makeInput('Morning Alarm'));
      const r2 = await create(makeInput('Evening Reminder'));
      const r3 = await create(makeInput('Weekly Check'));

      // All should be unsynced (syncedAt=null)
      const unsynced = await getUnsynced();
      expect(unsynced).toHaveLength(3);

      // getPushCandidates should select all of them
      const candidates = getPushCandidates(unsynced);
      expect(candidates).toHaveLength(3);

      const candidateIds = candidates.map((c) => c.id);
      expect(candidateIds).toContain(r1.id);
      expect(candidateIds).toContain(r2.id);
      expect(candidateIds).toContain(r3.id);
    });

    it('should exclude already-synced unmodified reminders from push candidates', async () => {
      // Create reminders
      const r1 = await create(makeInput('Synced Reminder'));
      const r2 = await create(makeInput('Unsynced Reminder'));

      // Simulate that r1 was already synced (apply remote record with same data)
      await applyRemoteRecords([{ ...r1, syncedAt: new Date() }]);

      // Only r2 should remain as a push candidate
      const unsynced = await getUnsynced();
      const candidates = getPushCandidates(unsynced);

      const candidateIds = candidates.map((c) => c.id);
      expect(candidateIds).toContain(r2.id);
      expect(candidateIds).not.toContain(r1.id);
    });

    it('should include modified-after-sync reminders as push candidates', async () => {
      // Create a reminder
      const r1 = await create(makeInput('Will Modify'));

      // Simulate sync by directly setting syncedAt to a past time
      const pastSyncTime = new Date(Date.now() - 60000);
      await db.reminders.update(r1.id, {
        syncedAt: pastSyncTime,
        modifiedAt: pastSyncTime,
      });

      // Now modify it locally (modifiedAt will be now, which is > syncedAt)
      await update(r1.id, { name: 'Modified After Sync' });

      // The modified reminder should be a push candidate again
      const unsynced = await getUnsynced();
      const candidates = getPushCandidates(unsynced);
      expect(candidates.some((c) => c.id === r1.id)).toBe(true);
    });

    it('should batch push candidates correctly for large sets', async () => {
      // Create 150 reminders to test batching (>100 requires multiple batches)
      for (let i = 0; i < 150; i++) {
        await create(makeInput(`Reminder ${i}`));
      }

      const unsynced = await getUnsynced();
      const candidates = getPushCandidates(unsynced);
      expect(candidates).toHaveLength(150);

      const batches = batchForPush(candidates);
      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(100);
      expect(batches[1]).toHaveLength(50);
    });

    it('should include soft-deleted reminders as push candidates when syncedAt is null', async () => {
      const r1 = await create(makeInput('To Delete'));
      await softDelete(r1.id);

      const unsynced = await getUnsynced();
      const candidates = getPushCandidates(unsynced);
      expect(candidates.some((c) => c.id === r1.id)).toBe(true);

      const deletedCandidate = candidates.find((c) => c.id === r1.id);
      expect(deletedCandidate?.isDeleted).toBe(true);
    });
  });

  describe('End-to-end pull and merge flow', () => {
    it('should insert new remote records that do not exist locally', async () => {
      // Start with one local reminder
      await create(makeInput('Local Only'));

      // Simulate remote records coming from the API
      const remoteId = crypto.randomUUID();
      const remoteReminder: Reminder = {
        id: remoteId,
        name: 'Remote Reminder',
        icon: '🌟',
        backgroundColor: PREDEFINED_PALETTE[5],
        isActive: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-06-15T12:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };

      const allLocal = await db.reminders.toArray();
      const { toInsert, toUpdate } = mergePulledReminders(allLocal, [remoteReminder]);

      expect(toInsert).toHaveLength(1);
      expect(toInsert[0].id).toBe(remoteId);
      expect(toInsert[0].syncedAt).not.toBeNull();
      expect(toUpdate).toHaveLength(0);
    });

    it('should overwrite local record when remote is newer (conflict resolution)', async () => {
      // Create a local reminder and mark it as synced
      const local = await create(makeInput('Original Name'));
      const syncedAt = new Date();
      await db.reminders.update(local.id, { syncedAt, modifiedAt: syncedAt });

      // Remote has the same ID but newer modifiedAt
      const remoteReminder: Reminder = {
        ...local,
        name: 'Updated From Server',
        modifiedAt: new Date(syncedAt.getTime() + 60000),
        syncedAt: null,
      };

      const allLocal = await db.reminders.toArray();
      const { toInsert, toUpdate } = mergePulledReminders(allLocal, [remoteReminder]);

      expect(toInsert).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0].name).toBe('Updated From Server');
      expect(toUpdate[0].syncedAt).not.toBeNull();
    });

    it('should keep local record when local is newer than remote', async () => {
      // Create a local reminder with a recent modifiedAt
      const local = await create(makeInput('Local Newer'));
      const localModifiedAt = new Date();
      await db.reminders.update(local.id, {
        modifiedAt: localModifiedAt,
        syncedAt: new Date(localModifiedAt.getTime() - 120000),
      });

      // Remote has same ID but older modifiedAt
      const remoteReminder: Reminder = {
        ...local,
        name: 'Stale Remote',
        modifiedAt: new Date(localModifiedAt.getTime() - 60000),
        syncedAt: null,
      };

      const allLocal = await db.reminders.toArray();
      const { toInsert, toUpdate } = mergePulledReminders(allLocal, [remoteReminder]);

      expect(toInsert).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });

    it('should prefer remote when modifiedAt timestamps are identical (tie-break)', async () => {
      const local = await create(makeInput('Tie Scenario'));
      const tieTime = new Date('2024-06-15T12:00:00Z');
      await db.reminders.update(local.id, { modifiedAt: tieTime, syncedAt: tieTime });

      const remoteReminder: Reminder = {
        ...local,
        name: 'Remote Wins Tie',
        modifiedAt: tieTime,
        syncedAt: null,
      };

      const allLocal = await db.reminders.toArray();
      const { toUpdate } = mergePulledReminders(allLocal, [remoteReminder]);

      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0].name).toBe('Remote Wins Tie');
    });
  });

  describe('Full sync cycle (push + pull combined)', () => {
    it('should complete a full create → modify → push → pull cycle', async () => {
      // Step 1: Create reminders locally
      const r1 = await create(makeInput('Reminder A'));
      const r2 = await create(makeInput('Reminder B'));
      await create(makeInput('Reminder C'));

      // Step 2: Modify one, deactivate another
      await update(r1.id, { name: 'Reminder A Updated' });
      await deactivate(r2.id);

      // Step 3: Get push candidates — all 3 should be candidates
      const unsynced = await getUnsynced();
      const candidates = getPushCandidates(unsynced);
      expect(candidates).toHaveLength(3);

      // Step 4: Simulate successful push by applying remote records
      // (server echoes back the records with syncedAt set)
      const pushTime = new Date();
      await applyRemoteRecords(
        candidates.map((c) => ({ ...c, syncedAt: pushTime })),
      );

      // Step 5: Verify no more push candidates after sync
      const postPushUnsynced = await getUnsynced();
      const postPushCandidates = getPushCandidates(postPushUnsynced);
      expect(postPushCandidates).toHaveLength(0);

      // Step 6: Simulate pull from server with a new record
      const pulledRemoteId = crypto.randomUUID();
      const pulledRemote: Reminder = {
        id: pulledRemoteId,
        name: 'From Another Device',
        icon: '📱',
        backgroundColor: PREDEFINED_PALETTE[10],
        isActive: true,
        createdAt: new Date('2024-06-01T08:00:00Z'),
        modifiedAt: new Date('2024-06-20T10:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      };

      const allLocalForPull = await db.reminders.toArray();
      const { toInsert } = mergePulledReminders(allLocalForPull, [pulledRemote]);
      expect(toInsert).toHaveLength(1);

      // Apply the pull results
      await applyRemoteRecords([pulledRemote]);

      // Step 7: Verify final state
      const allReminders = await getAll();
      expect(allReminders.some((r) => r.id === pulledRemoteId)).toBe(true);
      expect(allReminders.find((r) => r.id === r1.id)?.name).toBe('Reminder A Updated');
      expect(allReminders.find((r) => r.id === r2.id)?.isActive).toBe(false);
    });

    it('should handle conflict during pull when local was modified after push', async () => {
      // Create and sync a reminder
      const r1 = await create(makeInput('Conflict Test'));
      const syncTime = new Date('2024-06-01T10:00:00Z');
      await db.reminders.update(r1.id, { syncedAt: syncTime, modifiedAt: syncTime });

      // Modify locally AFTER the sync — set modifiedAt far into the future to guarantee local wins
      const localModifiedAt = new Date('2024-06-20T12:00:00Z');
      await db.reminders.update(r1.id, { name: 'Local Update After Sync', modifiedAt: localModifiedAt });

      // Server modified the same record but EARLIER than the local modification
      const localRecord = await db.reminders.get(r1.id);
      const remoteModified: Reminder = {
        ...localRecord!,
        name: 'Server Update',
        modifiedAt: new Date('2024-06-15T08:00:00Z'), // earlier than local
        syncedAt: null,
      };

      // Local modifiedAt (June 20) > remote modifiedAt (June 15) → local wins
      const allLocal = await db.reminders.toArray();
      const { toUpdate } = mergePulledReminders(allLocal, [remoteModified]);

      expect(toUpdate).toHaveLength(0);
    });

    it('should handle soft-deleted records through the sync cycle', async () => {
      // Create and sync
      const r1 = await create(makeInput('Will Delete'));
      const syncTime = new Date();
      await applyRemoteRecords([{ ...r1, syncedAt: syncTime }]);

      // Soft-delete locally
      await softDelete(r1.id);

      // Verify it becomes a push candidate (syncedAt was set to null on delete)
      const unsynced = await getUnsynced();
      const candidates = getPushCandidates(unsynced);
      expect(candidates.some((c) => c.id === r1.id && c.isDeleted)).toBe(true);

      // After push, verify it's excluded from getAll
      const visibleReminders = await getAll();
      expect(visibleReminders.some((r) => r.id === r1.id)).toBe(false);
    });
  });
});

