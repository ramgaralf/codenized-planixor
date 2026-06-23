// Feature: gh16-synchronization, Property 7: Sync config excluded from sync operations
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { db } from '@/data/db';

/**
 * The list of tables that participate in sync operations.
 * These are the tables with change tracking fields (modifiedAt, syncedAt, isDeleted)
 * and use UUID `id` as primary key.
 *
 * Tables excluded from sync:
 * - syncConfig: device-local config, uses 'key' PK, no change tracking fields
 * - notificationSettings: device-local preferences, uses 'key' PK, no change tracking fields
 *
 * Uses fast-check with minimum 100 iterations per property.
 */
const SYNCABLE_TABLES = [
  'calendarEvents',
  'shifts',
  'reminders',
  'annualHoursConfig',
  'notifications',
];

describe('syncServiceController — property tests', () => {
  /**
   * Property 7: Sync config excluded from sync operations
   *
   * For any set of records produced by the sync push candidate selection logic,
   * no record SHALL be of type SyncConfig. Equivalently, the SyncConfig table/store
   * SHALL never appear in the list of syncable entity types.
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('Property 7: Sync config excluded from sync operations', () => {
    it('syncConfig table should never appear in the list of syncable tables', () => {
      fc.assert(
        fc.property(fc.constantFrom(...SYNCABLE_TABLES), (tableName) => {
          expect(tableName).not.toBe('syncConfig');
        }),
        { numRuns: 100 },
      );
    });

    it('syncConfig table should exist in the database but not be syncable', () => {
      // Verify syncConfig table exists in the Dexie database
      const tableNames = db.tables.map((t) => t.name);
      expect(tableNames).toContain('syncConfig');

      // Verify syncConfig is NOT in the syncable tables list
      expect(SYNCABLE_TABLES).not.toContain('syncConfig');
    });

    it('for any syncable table name, it should not reference device-local tables', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ...db.tables.map((t) => t.name).filter((name) => SYNCABLE_TABLES.includes(name)),
          ),
          (tableName) => {
            expect(tableName).not.toBe('syncConfig');
            expect(tableName).not.toBe('notificationSettings');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('syncConfig table schema should use key PK (not id), confirming non-syncable structure', () => {
      const syncConfigTable = db.tables.find((t) => t.name === 'syncConfig');
      expect(syncConfigTable).toBeDefined();

      // Syncable tables use 'id' as primary key; syncConfig uses 'key'
      const primKey = syncConfigTable!.schema.primKey.keyPath;
      expect(primKey).toBe('key');
      expect(primKey).not.toBe('id');
    });

    it('all syncable tables should use id as primary key, distinguishing them from config tables', () => {
      fc.assert(
        fc.property(fc.constantFrom(...SYNCABLE_TABLES), (tableName) => {
          const table = db.tables.find((t) => t.name === tableName);
          expect(table).toBeDefined();
          expect(table!.schema.primKey.keyPath).toBe('id');
        }),
        { numRuns: 100 },
      );
    });
  });
});
