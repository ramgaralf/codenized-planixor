import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';

import type { NotificationRecord } from '../types';
import type { CalendarEvent } from '@features/calendar-events/models';

// Mock channel settings to 'app' for property tests — channel routing is tested in unit tests.
// Property tests focus on the due-notification identification logic (which records get processed).
vi.mock('./notificationSettings', () => ({
  getChannel: vi.fn().mockResolvedValue('app'),
}));

vi.mock('./systemNotificationDelivery', () => ({
  deliverSystemNotification: vi.fn().mockReturnValue(true),
}));

import {
  reconcileNotifications,
  deleteNotificationsForEvent,
  runCheckCycle,
  computeEventStartDateTime,
  computeTriggerTime,
} from './notificationService';

/**
 * Property-based tests for notificationService reconciliation logic.
 * Feature: gh12-notifications
 * Uses fast-check with minimum 100 iterations per property.
 */

/** Valid alert offset values */
const VALID_OFFSETS = [0, 10, 60, 1440] as const;

/** Generates a random subset (0–4 elements) of valid alert offsets */
const alertOffsetsArb = fc
  .subarray([...VALID_OFFSETS], { minLength: 0, maxLength: 4 })
  .map((arr) => [...new Set(arr)]);

/** Generates a future ISO date string (2030–2035) for events that are clearly in the future */
const futureDateArb = fc
  .integer({ min: 2030, max: 2035 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
      }),
    ),
  );

/** Generates a valid time in minutes from midnight (0–1439) */
const timeMinutesArb = fc.integer({ min: 0, max: 1439 });



/**
 * Creates a NotificationRecord for testing.
 */
const createNotificationRecord = (overrides: Partial<NotificationRecord>): NotificationRecord => ({
  id: crypto.randomUUID(),
  calendarEventId: 'event-1',
  alertOffset: 10,
  triggerTime: new Date('2030-06-15T09:50:00Z'),
  isDelivered: false,
  isRead: false,
  modifiedAt: new Date('2025-01-01T00:00:00Z'),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});



describe('notificationService — Property Tests', () => {
  beforeEach(async () => {
    await db.open();
    await db.notifications.clear();
  });

  afterEach(async () => {
    await db.notifications.clear();
  });

  /**
   * Property 3: Alert config reconciliation produces correct diff
   *
   * For any existing set of non-delivered NotificationRecords for an event
   * and any new alertOffsets array, after reconciliation:
   * (a) all previously existing non-delivered records for removed offsets have isDeleted=true,
   * (b) new records exist for each added offset with future trigger time, and
   * (c) records for unchanged offsets with future trigger times remain unaffected (delivered records).
   *
   * **Validates: Requirements 1.5, 1.6, 8.7**
   */
  describe('Property 3: Alert config reconciliation produces correct diff', () => {
    it('(a) non-delivered records for removed offsets are soft-deleted after reconciliation', async () => {
      const eventId = 'event-reconcile-a';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          alertOffsetsArb,
          async (existingOffsets, newAlertOffsets) => {
            await db.notifications.clear();

            // Create existing non-delivered records for each existing offset
            const existingRecords = existingOffsets.map((offset) =>
              createNotificationRecord({
                calendarEventId: eventId,
                alertOffset: offset,
                triggerTime: new Date('2030-06-15T09:50:00Z'),
                isDelivered: false,
                isDeleted: false,
              }),
            );
            await db.notifications.bulkAdd(existingRecords);

            // Determine which offsets are "removed" (in existing but not in new)
            const removedOffsets = existingOffsets.filter((o) => !newAlertOffsets.includes(o));

            // Create a future event with the new alertOffsets
            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2030-06-15',
              endDay: '2030-06-15',
              startTime: 600, // 10:00 UTC
              endTime: 660,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets: newAlertOffsets,
            };

            await reconcileNotifications(event);

            // All non-delivered records for removed offsets should be soft-deleted
            const allRecords = await db.notifications.toArray();
            for (const offset of removedOffsets) {
              // Find the original record for this offset (match by old IDs)
              const originalRecord = existingRecords.find((er) => er.alertOffset === offset);
              if (originalRecord) {
                const rec = allRecords.find((r) => r.id === originalRecord.id);
                expect(rec).toBeDefined();
                expect(rec!.isDeleted).toBe(true);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(b) new records are created for each added offset with future trigger time', async () => {
      const eventId = 'event-reconcile-b';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 0, maxLength: 3 }),
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          async (existingOffsets, newAlertOffsets) => {
            await db.notifications.clear();

            // Create existing non-delivered records
            const existingRecords = existingOffsets.map((offset) =>
              createNotificationRecord({
                calendarEventId: eventId,
                alertOffset: offset,
                triggerTime: new Date('2030-06-15T09:50:00Z'),
                isDelivered: false,
                isDeleted: false,
              }),
            );
            await db.notifications.bulkAdd(existingRecords);

            // Determine added offsets (in new but not in existing)
            const addedOffsets = newAlertOffsets.filter((o) => !existingOffsets.includes(o));

            // Use a far future date so all trigger times are in the future
            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2030-06-15',
              endDay: '2030-06-15',
              startTime: 600, // 10:00 UTC
              endTime: 660,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets: newAlertOffsets,
            };

            await reconcileNotifications(event);

            // For each added offset, a new non-deleted record should exist
            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            for (const offset of addedOffsets) {
              const matchingRecord = activeRecords.find((r) => r.alertOffset === offset);
              expect(matchingRecord).toBeDefined();
              expect(matchingRecord!.isDelivered).toBe(false);
              expect(matchingRecord!.isRead).toBe(false);
              expect(matchingRecord!.triggerTime).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(c) delivered records for unchanged offsets remain unaffected', async () => {
      const eventId = 'event-reconcile-c';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          async (offsets) => {
            await db.notifications.clear();

            // Create delivered records for these offsets
            const deliveredRecords = offsets.map((offset) =>
              createNotificationRecord({
                calendarEventId: eventId,
                alertOffset: offset,
                triggerTime: new Date('2030-06-15T09:50:00Z'),
                isDelivered: true, // already delivered
                isDeleted: false,
                modifiedAt: new Date('2025-01-01T00:00:00Z'),
              }),
            );
            await db.notifications.bulkAdd(deliveredRecords);

            // Reconcile with the same offsets (unchanged)
            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2030-06-15',
              endDay: '2030-06-15',
              startTime: 600,
              endTime: 660,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets: offsets,
            };

            await reconcileNotifications(event);

            // Delivered records should remain unchanged (not deleted)
            for (const deliveredRecord of deliveredRecords) {
              const rec = await db.notifications.get(deliveredRecord.id);
              expect(rec).toBeDefined();
              expect(rec!.isDeleted).toBe(false);
              expect(rec!.isDelivered).toBe(true);
              // modifiedAt should NOT be updated on delivered records
              expect(rec!.modifiedAt.getTime()).toBe(
                new Date('2025-01-01T00:00:00Z').getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('combined: reconciliation correctly produces diff with mixed existing records', async () => {
      const eventId = 'event-reconcile-mixed';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          alertOffsetsArb,
          async (existingOffsets, newAlertOffsets) => {
            await db.notifications.clear();

            // Create a mix of delivered and non-delivered records
            const existingRecords: NotificationRecord[] = [];
            for (let i = 0; i < existingOffsets.length; i++) {
              const offset = existingOffsets[i];
              // Alternate: even index = non-delivered, odd index = delivered
              const isDelivered = i % 2 === 1;
              existingRecords.push(
                createNotificationRecord({
                  calendarEventId: eventId,
                  alertOffset: offset,
                  triggerTime: new Date('2030-06-15T09:50:00Z'),
                  isDelivered,
                  isDeleted: false,
                  modifiedAt: new Date('2025-01-01T00:00:00Z'),
                }),
              );
            }
            await db.notifications.bulkAdd(existingRecords);

            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2030-06-15',
              endDay: '2030-06-15',
              startTime: 600,
              endTime: 660,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets: newAlertOffsets,
            };

            await reconcileNotifications(event);

            const allRecords = await db.notifications.toArray();

            // (a) Non-delivered records for removed offsets should be soft-deleted
            const removedOffsets = existingOffsets.filter((o) => !newAlertOffsets.includes(o));
            for (const record of existingRecords) {
              if (!record.isDelivered && removedOffsets.includes(record.alertOffset)) {
                const rec = allRecords.find((r) => r.id === record.id);
                expect(rec).toBeDefined();
                expect(rec!.isDeleted).toBe(true);
              }
            }

            // (b) Delivered records remain unaffected (not soft-deleted)
            for (const record of existingRecords) {
              if (record.isDelivered) {
                const rec = allRecords.find((r) => r.id === record.id);
                expect(rec).toBeDefined();
                expect(rec!.isDeleted).toBe(false);
                expect(rec!.modifiedAt.getTime()).toBe(
                  new Date('2025-01-01T00:00:00Z').getTime(),
                );
              }
            }

            // (c) For added offsets (in new but not existing), new active records exist
            const addedOffsets = newAlertOffsets.filter((o) => !existingOffsets.includes(o));
            const activeRecords = allRecords.filter(
              (r) => r.calendarEventId === eventId && !r.isDeleted,
            );

            for (const offset of addedOffsets) {
              const matchingRecord = activeRecords.find((r) => r.alertOffset === offset);
              expect(matchingRecord).toBeDefined();
              expect(matchingRecord!.isDelivered).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 12: Uniqueness constraint on (calendarEventId, alertOffset)
   *
   * For any non-deleted NotificationRecords in the store, there SHALL exist at most
   * one record for each unique combination of (calendarEventId, alertOffset).
   * Attempting to create a duplicate SHALL either be prevented or result in an update
   * of the existing record.
   *
   * **Validates: Requirements 8.1**
   */
  describe('Property 12: Uniqueness constraint on (calendarEventId, alertOffset)', () => {
    /**
     * Generates a random sequence of reconcile operations:
     * each operation has a random subset of alertOffsets to simulate
     * the user changing alert config multiple times.
     */
    const reconcileSequenceArb = fc
      .array(
        fc.subarray([...VALID_OFFSETS], { minLength: 0, maxLength: 4 }),
        { minLength: 1, maxLength: 6 },
      );

    it('after multiple reconcile operations, no duplicate (calendarEventId, alertOffset) pairs exist among non-deleted records', async () => {
      const eventId = 'event-uniqueness-single';

      await fc.assert(
        fc.asyncProperty(reconcileSequenceArb, async (offsetSequence) => {
          await db.notifications.clear();

          // Apply a sequence of reconcile operations with different alertOffsets
          for (const alertOffsets of offsetSequence) {
            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2030-06-15',
              endDay: '2030-06-15',
              startTime: 600, // 10:00 UTC — far future, all offsets produce future trigger times
              endTime: 660,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(event);
          }

          // Invariant: among non-deleted records, no duplicate (calendarEventId, alertOffset) pairs
          const activeRecords = await db.notifications
            .where('calendarEventId')
            .equals(eventId)
            .filter((r) => !r.isDeleted)
            .toArray();

          const pairs = activeRecords.map(
            (r) => `${r.calendarEventId}:${r.alertOffset}`,
          );
          const uniquePairs = new Set(pairs);

          expect(pairs.length).toBe(uniquePairs.size);
        }),
        { numRuns: 100 },
      );
    });

    it('after multiple reconcile operations across multiple events, uniqueness holds per event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }),
          fc.array(
            fc.subarray([...VALID_OFFSETS], { minLength: 0, maxLength: 4 }),
            { minLength: 1, maxLength: 5 },
          ),
          async (eventIds, offsetSequence) => {
            await db.notifications.clear();

            // Apply reconcile sequence to each event
            for (const eventId of eventIds) {
              for (const alertOffsets of offsetSequence) {
                const event: CalendarEvent = {
                  id: eventId,
                  eventType: 'reminder',
                  eventTypeId: 'reminder-type-1',
                  startDay: '2030-06-15',
                  endDay: '2030-06-15',
                  startTime: 600,
                  endTime: 660,
                  totalHours: 60,
                  notes: null,
                  modifiedAt: new Date(),
                  syncedAt: null,
                  isDeleted: false,
                  alertOffsets,
                };

                await reconcileNotifications(event);
              }
            }

            // Check uniqueness constraint per event
            for (const eventId of eventIds) {
              const activeRecords = await db.notifications
                .where('calendarEventId')
                .equals(eventId)
                .filter((r) => !r.isDeleted)
                .toArray();

              const pairs = activeRecords.map(
                (r) => `${r.calendarEventId}:${r.alertOffset}`,
              );
              const uniquePairs = new Set(pairs);

              expect(pairs.length).toBe(uniquePairs.size);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('calling reconcile with the same alertOffsets repeatedly never creates duplicates', async () => {
      const eventId = 'event-uniqueness-idempotent';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          fc.integer({ min: 2, max: 5 }),
          async (alertOffsets, repeatCount) => {
            await db.notifications.clear();

            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2030-06-15',
              endDay: '2030-06-15',
              startTime: 600,
              endTime: 660,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            // Call reconcile multiple times with identical config
            for (let i = 0; i < repeatCount; i++) {
              await reconcileNotifications(event);
            }

            // Exactly one non-deleted record per offset
            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            const offsetsInStore = activeRecords
              .map((r) => r.alertOffset)
              .sort((a, b) => a - b);
            const expectedOffsets = [...alertOffsets].sort((a, b) => a - b);

            expect(offsetsInStore).toEqual(expectedOffsets);
            expect(activeRecords.length).toBe(alertOffsets.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Trigger time recomputation on start time change
   *
   * For any calendar event with non-deleted NotificationRecords and any new start time,
   * after recomputation each remaining non-deleted record's triggerTime SHALL equal
   * the new event start DateTime (UTC) minus alertOffset minutes, and modifiedAt
   * SHALL be updated to the current UTC timestamp.
   *
   * **Validates: Requirements 1.8, 8.8, 9.1**
   */
  describe('Property 5: Trigger time recomputation on start time change', () => {
    it('new records have triggerTime = new event start - alertOffset minutes', async () => {
      const eventId = 'event-recompute-trigger';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          futureDateArb,
          timeMinutesArb,
          futureDateArb,
          timeMinutesArb,
          async (alertOffsets, originalDay, originalTime, newDay, newTime) => {
            // Ensure the new start is different from the original
            if (originalDay === newDay && originalTime === newTime) return;

            await db.notifications.clear();

            // Step 1: Create initial records by reconciling with original start time
            const originalEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: originalDay,
              endDay: originalDay,
              startTime: originalTime,
              endTime: Math.min(originalTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(originalEvent);

            // Verify initial records were created
            const initialRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // Only continue if some records were created (future trigger times)
            if (initialRecords.length === 0) return;

            // Step 2: Reconcile with a new start time (same alertOffsets)
            const beforeReconcile = Date.now();

            const updatedEvent: CalendarEvent = {
              ...originalEvent,
              startDay: newDay,
              endDay: newDay,
              startTime: newTime,
              endTime: Math.min(newTime + 60, 1439),
              modifiedAt: new Date(),
            };

            await reconcileNotifications(updatedEvent);

            const afterReconcile = Date.now();

            // Step 3: Verify the new active records have correct trigger times
            const newActiveRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            const newEventStartDateTime = computeEventStartDateTime(newDay, newTime);

            for (const record of newActiveRecords) {
              // Each record's triggerTime should equal new event start - alertOffset minutes
              const expectedTriggerTime = computeTriggerTime(
                newEventStartDateTime,
                record.alertOffset,
              );
              expect(record.triggerTime.getTime()).toBe(expectedTriggerTime);

              // modifiedAt should be recent (within 1 second of the call)
              expect(record.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeReconcile);
              expect(record.modifiedAt.getTime()).toBeLessThanOrEqual(afterReconcile + 1000);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('old non-delivered records are soft-deleted after start time change', async () => {
      const eventId = 'event-recompute-softdelete';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          futureDateArb,
          timeMinutesArb,
          futureDateArb,
          timeMinutesArb,
          async (alertOffsets, originalDay, originalTime, newDay, newTime) => {
            if (originalDay === newDay && originalTime === newTime) return;

            await db.notifications.clear();

            // Create initial records
            const originalEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: originalDay,
              endDay: originalDay,
              startTime: originalTime,
              endTime: Math.min(originalTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(originalEvent);

            // Capture the IDs of the initial non-deleted records
            const initialRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            if (initialRecords.length === 0) return;

            const initialIds = initialRecords.map((r) => r.id);

            // Reconcile with new start time
            const updatedEvent: CalendarEvent = {
              ...originalEvent,
              startDay: newDay,
              endDay: newDay,
              startTime: newTime,
              endTime: Math.min(newTime + 60, 1439),
              modifiedAt: new Date(),
            };

            await reconcileNotifications(updatedEvent);

            // All original non-delivered records should be soft-deleted
            for (const id of initialIds) {
              const record = await db.notifications.get(id);
              expect(record).toBeDefined();
              expect(record!.isDeleted).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('each new record triggerTime equals computeEventStartDateTime(newStartDay, newStartTime) - alertOffset * 60000', async () => {
      const eventId = 'event-recompute-formula';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          futureDateArb,
          timeMinutesArb,
          async (alertOffsets, startDay, startTime) => {
            await db.notifications.clear();

            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay,
              endDay: startDay,
              startTime,
              endTime: Math.min(startTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(event);

            const newEventStart = computeEventStartDateTime(startDay, startTime);
            const now = Date.now();

            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // Only records with future trigger times should exist
            for (const record of activeRecords) {
              const expectedTriggerTime = newEventStart - record.alertOffset * 60_000;
              expect(record.triggerTime.getTime()).toBe(expectedTriggerTime);
              // The trigger time must be in the future (> now at time of creation)
              expect(expectedTriggerTime).toBeGreaterThan(now - 1000); // small tolerance
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Notification record creation filters by future trigger time
   *
   * For any calendar event with a future start time and any subset of alertOffsets
   * [0, 10, 60, 1440], the system SHALL create exactly one NotificationRecord for
   * each offset whose computed trigger time is strictly in the future, and SHALL NOT
   * create records for offsets whose trigger time is in the past or equal to now.
   *
   * **Validates: Requirements 1.4**
   */
  describe('Property 2: Notification record creation filters by future trigger time', () => {
    /**
     * Generates a future start day (ISO date string YYYY-MM-DD) that is at least
     * 2 days from now to ensure the event start is reliably in the future.
     */
    const futureStartDayArb = fc
      .integer({ min: 2, max: 365 })
      .map((daysAhead) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + daysAhead);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

    /** Generates a valid startTime in minutes from midnight (0–1439) */
    const startTimeArb = fc.integer({ min: 0, max: 1439 });

    /** Generates a random subset of alert offsets for Property 2 */
    const alertOffsetsSubsetArb = fc
      .subarray([...VALID_OFFSETS], { minLength: 0, maxLength: 4 })
      .map((arr) => [...arr].sort((a, b) => a - b));

    /** Generates a CalendarEvent with a future start time and random alertOffsets */
    const futureEventForProp2Arb: fc.Arbitrary<CalendarEvent> = fc
      .tuple(fc.uuid(), futureStartDayArb, startTimeArb, alertOffsetsSubsetArb)
      .map(([id, startDay, startTime, alertOffsets]) => ({
        id,
        eventType: 'reminder' as const,
        eventTypeId: crypto.randomUUID(),
        startDay,
        endDay: startDay,
        startTime,
        endTime: Math.min(startTime + 60, 1439),
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets,
      }));

    it('should create exactly one record per offset with future trigger time and zero for past/present offsets', async () => {
      await fc.assert(
        fc.asyncProperty(futureEventForProp2Arb, async (event) => {
          await db.notifications.clear();

          const now = Date.now();

          await reconcileNotifications(event);

          const eventStartDateTime = computeEventStartDateTime(
            event.startDay,
            event.startTime,
          );

          // Determine which offsets should have produced records (future trigger time)
          const expectedFutureOffsets = event.alertOffsets.filter((offset) => {
            const triggerTimeMs = computeTriggerTime(eventStartDateTime, offset);
            return triggerTimeMs > now;
          });

          // Determine which offsets should NOT have produced records
          const expectedPastOffsets = event.alertOffsets.filter((offset) => {
            const triggerTimeMs = computeTriggerTime(eventStartDateTime, offset);
            return triggerTimeMs <= now;
          });

          // Fetch all created records for this event
          const records = await db.notifications
            .where('calendarEventId')
            .equals(event.id)
            .filter((r) => r.isDeleted === false)
            .toArray();

          // Exactly one record per future offset
          expect(records.length).toBe(expectedFutureOffsets.length);

          // Each record maps to a unique offset from the expected future set
          const createdOffsets = records.map((r) => r.alertOffset).sort((a, b) => a - b);
          expect(createdOffsets).toEqual([...expectedFutureOffsets].sort((a, b) => a - b));

          // Verify each record has correct trigger time and field values
          for (const record of records) {
            const expectedTriggerTimeMs = computeTriggerTime(
              eventStartDateTime,
              record.alertOffset,
            );

            expect(record.triggerTime.getTime()).toBe(expectedTriggerTimeMs);
            expect(record.calendarEventId).toBe(event.id);
            expect(record.isDelivered).toBe(false);
            expect(record.isRead).toBe(false);
            expect(record.isDeleted).toBe(false);
            expect(record.syncedAt).toBeNull();
            expect(record.id).toBeDefined();
            expect(record.modifiedAt).toBeInstanceOf(Date);
          }

          // Verify NO records exist for past/present offsets
          for (const pastOffset of expectedPastOffsets) {
            const pastRecord = records.find((r) => r.alertOffset === pastOffset);
            expect(pastRecord).toBeUndefined();
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should create zero records when all trigger times are in the past', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          alertOffsetsSubsetArb.filter((offsets) => offsets.length > 0),
          async (id, alertOffsets) => {
            await db.notifications.clear();

            // Use a past start time (yesterday at 00:00) so all trigger times are in the past
            const yesterday = new Date();
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            const startDay = yesterday.toISOString().slice(0, 10);

            const event: CalendarEvent = {
              id,
              eventType: 'reminder',
              eventTypeId: crypto.randomUUID(),
              startDay,
              endDay: startDay,
              startTime: 0,
              endTime: 60,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(event);

            const records = await db.notifications
              .where('calendarEventId')
              .equals(event.id)
              .filter((r) => r.isDeleted === false)
              .toArray();

            expect(records.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create exactly one record per offset (no duplicates) when called multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(futureEventForProp2Arb, async (event) => {
          await db.notifications.clear();

          // Call reconcile twice
          await reconcileNotifications(event);
          await reconcileNotifications(event);

          const eventStartDateTime = computeEventStartDateTime(
            event.startDay,
            event.startTime,
          );

          const expectedFutureOffsets = event.alertOffsets.filter((offset) => {
            const triggerTimeMs = computeTriggerTime(eventStartDateTime, offset);
            return triggerTimeMs > Date.now();
          });

          // Fetch all non-deleted records
          const records = await db.notifications
            .where('calendarEventId')
            .equals(event.id)
            .filter((r) => r.isDeleted === false)
            .toArray();

          // Still only one record per offset (no duplicates)
          expect(records.length).toBe(expectedFutureOffsets.length);

          const createdOffsets = records.map((r) => r.alertOffset).sort((a, b) => a - b);
          expect(createdOffsets).toEqual([...expectedFutureOffsets].sort((a, b) => a - b));
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 14: Cascade soft-delete on calendar event deletion
   *
   * For any calendar event that is soft-deleted, ALL associated NotificationRecords
   * (regardless of their isDelivered or isRead state) SHALL have isDeleted set to true
   * and modifiedAt updated to the current UTC timestamp.
   *
   * Additional invariants:
   * - Records that were already deleted (isDeleted=true) before the cascade should
   *   remain unchanged (their modifiedAt should NOT be updated).
   * - Records belonging to OTHER events should not be affected.
   *
   * **Validates: Requirements 8.5, 9.4**
   */
  describe('Property 14: Cascade soft-delete on calendar event deletion', () => {
    /** Generates a random isDelivered state */
    const isDeliveredArb = fc.boolean();

    /** Generates a random isRead state */
    const isReadArb = fc.boolean();

    /** Generates a random isDeleted state for pre-existing records */
    const isDeletedArb = fc.boolean();

    /**
     * Generates a random set of NotificationRecords for a given event,
     * with varying isDelivered, isRead, and isDeleted states.
     */
    const notificationRecordsForEventArb = (
      eventId: string,
    ): fc.Arbitrary<NotificationRecord[]> =>
      fc
        .subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 })
        .chain((offsets) =>
          fc
            .tuple(
              ...offsets.map((offset) =>
                fc
                  .tuple(isDeliveredArb, isReadArb, isDeletedArb)
                  .map(([isDelivered, isRead, isDeleted]) =>
                    createNotificationRecord({
                      calendarEventId: eventId,
                      alertOffset: offset,
                      triggerTime: new Date('2030-06-15T09:50:00Z'),
                      isDelivered,
                      isRead,
                      isDeleted,
                      modifiedAt: new Date('2025-01-01T00:00:00Z'),
                    }),
                  ),
              ),
            )
            .map((records) => records as NotificationRecord[]),
        );

    /**
     * Generates records for a different event (to verify they are not affected).
     */
    const otherEventRecordsArb = (
      otherEventId: string,
    ): fc.Arbitrary<NotificationRecord[]> =>
      fc
        .subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 3 })
        .chain((offsets) =>
          fc
            .tuple(
              ...offsets.map((offset) =>
                fc
                  .tuple(isDeliveredArb, isReadArb)
                  .map(([isDelivered, isRead]) =>
                    createNotificationRecord({
                      calendarEventId: otherEventId,
                      alertOffset: offset,
                      triggerTime: new Date('2030-07-20T14:00:00Z'),
                      isDelivered,
                      isRead,
                      isDeleted: false,
                      modifiedAt: new Date('2025-02-15T12:00:00Z'),
                    }),
                  ),
              ),
            )
            .map((records) => records as NotificationRecord[]),
        );

    it('should soft-delete ALL non-deleted records for the target event regardless of delivery/read state', async () => {
      const eventId = 'event-cascade-delete';

      await fc.assert(
        fc.asyncProperty(
          notificationRecordsForEventArb(eventId),
          async (records) => {
            await db.notifications.clear();

            await db.notifications.bulkAdd(records);

            const beforeTimestamp = Date.now();
            await deleteNotificationsForEvent(eventId);
            const afterTimestamp = Date.now();

            const allRecords = await db.notifications.toArray();

            // All records that were NOT already deleted should now be deleted
            for (const original of records) {
              const rec = allRecords.find((r) => r.id === original.id);
              expect(rec).toBeDefined();

              if (!original.isDeleted) {
                // Was not deleted before — should now be soft-deleted
                expect(rec!.isDeleted).toBe(true);
                // modifiedAt should be updated to approximately now
                expect(rec!.modifiedAt.getTime()).toBeGreaterThanOrEqual(
                  beforeTimestamp,
                );
                expect(rec!.modifiedAt.getTime()).toBeLessThanOrEqual(
                  afterTimestamp,
                );
              } else {
                // Was already deleted — should remain unchanged
                expect(rec!.isDeleted).toBe(true);
                expect(rec!.modifiedAt.getTime()).toBe(
                  new Date('2025-01-01T00:00:00Z').getTime(),
                );
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not affect records belonging to other events', async () => {
      const targetEventId = 'event-target-cascade';
      const otherEventId = 'event-other-unaffected';

      await fc.assert(
        fc.asyncProperty(
          notificationRecordsForEventArb(targetEventId),
          otherEventRecordsArb(otherEventId),
          async (targetRecords, otherRecords) => {
            await db.notifications.clear();

            await db.notifications.bulkAdd(targetRecords);
            await db.notifications.bulkAdd(otherRecords);

            await deleteNotificationsForEvent(targetEventId);

            // Verify other event records are completely unaffected
            for (const original of otherRecords) {
              const rec = await db.notifications.get(original.id);
              expect(rec).toBeDefined();
              expect(rec!.isDeleted).toBe(false);
              expect(rec!.isDelivered).toBe(original.isDelivered);
              expect(rec!.isRead).toBe(original.isRead);
              expect(rec!.modifiedAt.getTime()).toBe(
                new Date('2025-02-15T12:00:00Z').getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle events with no associated records gracefully (no errors)', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (eventId) => {
          await db.notifications.clear();

          // Calling delete on an event with no records should not throw
          await expect(
            deleteNotificationsForEvent(eventId),
          ).resolves.toBeUndefined();

          // Database should remain empty
          const allRecords = await db.notifications.toArray();
          expect(allRecords.length).toBe(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Due notification identification
   *
   * For any set of NotificationRecords and a reference "now" timestamp, the set of
   * due notifications SHALL be exactly those records where triggerTime ≤ now AND
   * isDelivered = false AND isDeleted = false, with no age-based expiration threshold.
   *
   * After calling runCheckCycle(), EXACTLY the records where triggerTime <= now AND
   * isDelivered=false AND isDeleted=false get marked as delivered (isDelivered=true).
   * Records that were already delivered, deleted, or have future trigger times remain unchanged.
   *
   * **Validates: Requirements 2.1, 2.2, 2.9, 6.6**
   */
  describe('Property 6: Due notification identification', () => {
    /**
     * Generates a trigger time that is in the past relative to the reference "now".
     * Range: 1 minute to 7 days in the past (covers both recent and old notifications).
     */
    const pastTriggerTimeArb = (now: Date): fc.Arbitrary<Date> =>
      fc.integer({ min: 1, max: 10_080 }).map((minutesAgo) =>
        new Date(now.getTime() - minutesAgo * 60_000),
      );

    /**
     * Generates a trigger time that is strictly in the future relative to the reference "now".
     * Range: 1 minute to 7 days in the future.
     */
    const futureTriggerTimeArb = (now: Date): fc.Arbitrary<Date> =>
      fc.integer({ min: 1, max: 10_080 }).map((minutesAhead) =>
        new Date(now.getTime() + minutesAhead * 60_000),
      );

    /**
     * Generates a single NotificationRecord with randomized state.
     * triggerTime can be past or future, isDelivered and isDeleted are random booleans.
     */
    const notificationRecordArb = (now: Date): fc.Arbitrary<NotificationRecord> =>
      fc.tuple(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom(0, 10, 60, 1440),
        fc.boolean(), // isPast: true = past triggerTime, false = future triggerTime
        fc.boolean(), // isDelivered
        fc.boolean(), // isDeleted
        fc.boolean(), // isRead
      ).chain(([id, calendarEventId, alertOffset, isPast, isDelivered, isDeleted, isRead]) => {
        const triggerTimeArb = isPast
          ? pastTriggerTimeArb(now)
          : futureTriggerTimeArb(now);

        return triggerTimeArb.map((triggerTime) => ({
          id,
          calendarEventId,
          alertOffset,
          triggerTime,
          isDelivered,
          isRead,
          isDeleted,
          modifiedAt: new Date('2025-01-01T00:00:00Z'),
          syncedAt: null,
        }));
      });

    /**
     * Generates a set of 1–20 NotificationRecords with varying states.
     */
    const notificationSetArb = (now: Date): fc.Arbitrary<NotificationRecord[]> =>
      fc.array(notificationRecordArb(now), { minLength: 1, maxLength: 20 });

    it('runCheckCycle marks exactly those records where triggerTime <= now AND isDelivered=false AND isDeleted=false', async () => {
      const now = new Date();

      await fc.assert(
        fc.asyncProperty(notificationSetArb(now), async (records) => {
          await db.notifications.clear();
          await db.notifications.bulkAdd(records);

          // Identify the set of records that SHOULD be marked as delivered
          const expectedDueIds = new Set(
            records
              .filter(
                (r) =>
                  r.triggerTime.getTime() <= now.getTime() &&
                  r.isDelivered === false &&
                  r.isDeleted === false,
              )
              .map((r) => r.id),
          );

          await runCheckCycle();

          // Verify the result
          const allRecordsAfter = await db.notifications.toArray();

          for (const record of allRecordsAfter) {
            const original = records.find((r) => r.id === record.id)!;

            if (expectedDueIds.has(record.id)) {
              // Due records: should now have isDelivered=true
              expect(record.isDelivered).toBe(true);
              // modifiedAt should have been updated
              expect(record.modifiedAt.getTime()).toBeGreaterThanOrEqual(
                now.getTime(),
              );
            } else {
              // Non-due records: should remain completely unchanged
              expect(record.isDelivered).toBe(original.isDelivered);
              expect(record.isDeleted).toBe(original.isDeleted);
              expect(record.isRead).toBe(original.isRead);
              expect(record.modifiedAt.getTime()).toBe(
                original.modifiedAt.getTime(),
              );
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('records with future triggerTime are never marked as delivered', async () => {
      const now = new Date();

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(fc.uuid(), fc.uuid(), fc.constantFrom(0, 10, 60, 1440)).chain(
              ([id, calendarEventId, alertOffset]) =>
                futureTriggerTimeArb(now).map((triggerTime) => ({
                  id,
                  calendarEventId,
                  alertOffset,
                  triggerTime,
                  isDelivered: false,
                  isRead: false,
                  isDeleted: false,
                  modifiedAt: new Date('2025-01-01T00:00:00Z'),
                  syncedAt: null,
                })),
            ),
            { minLength: 1, maxLength: 15 },
          ),
          async (records) => {
            await db.notifications.clear();
            await db.notifications.bulkAdd(records);

            await runCheckCycle();

            const allRecordsAfter = await db.notifications.toArray();

            // None should be marked as delivered
            for (const record of allRecordsAfter) {
              expect(record.isDelivered).toBe(false);
              expect(record.modifiedAt.getTime()).toBe(
                new Date('2025-01-01T00:00:00Z').getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('already-delivered records are not modified by runCheckCycle', async () => {
      const now = new Date();

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(fc.uuid(), fc.uuid(), fc.constantFrom(0, 10, 60, 1440)).chain(
              ([id, calendarEventId, alertOffset]) =>
                pastTriggerTimeArb(now).map((triggerTime) => ({
                  id,
                  calendarEventId,
                  alertOffset,
                  triggerTime,
                  isDelivered: true, // already delivered
                  isRead: false,
                  isDeleted: false,
                  modifiedAt: new Date('2025-03-15T08:00:00Z'),
                  syncedAt: null,
                })),
            ),
            { minLength: 1, maxLength: 15 },
          ),
          async (records) => {
            await db.notifications.clear();
            await db.notifications.bulkAdd(records);

            await runCheckCycle();

            const allRecordsAfter = await db.notifications.toArray();

            // All records should remain unchanged — already delivered
            for (const record of allRecordsAfter) {
              expect(record.isDelivered).toBe(true);
              expect(record.modifiedAt.getTime()).toBe(
                new Date('2025-03-15T08:00:00Z').getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('deleted records with past triggerTime are not marked as delivered', async () => {
      const now = new Date();

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(fc.uuid(), fc.uuid(), fc.constantFrom(0, 10, 60, 1440)).chain(
              ([id, calendarEventId, alertOffset]) =>
                pastTriggerTimeArb(now).map((triggerTime) => ({
                  id,
                  calendarEventId,
                  alertOffset,
                  triggerTime,
                  isDelivered: false,
                  isRead: false,
                  isDeleted: true, // soft-deleted
                  modifiedAt: new Date('2025-02-10T12:00:00Z'),
                  syncedAt: null,
                })),
            ),
            { minLength: 1, maxLength: 15 },
          ),
          async (records) => {
            await db.notifications.clear();
            await db.notifications.bulkAdd(records);

            await runCheckCycle();

            const allRecordsAfter = await db.notifications.toArray();

            // Deleted records should remain unchanged — not delivered
            for (const record of allRecordsAfter) {
              expect(record.isDelivered).toBe(false);
              expect(record.isDeleted).toBe(true);
              expect(record.modifiedAt.getTime()).toBe(
                new Date('2025-02-10T12:00:00Z').getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('no age-based expiration: very old notifications (>72h) are still delivered', async () => {
      const now = new Date();

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(fc.uuid(), fc.uuid(), fc.constantFrom(0, 10, 60, 1440)).chain(
              ([id, calendarEventId, alertOffset]) =>
                // Generate very old trigger times: 3–30 days ago
                fc.integer({ min: 4320, max: 43_200 }).map((minutesAgo) => ({
                  id,
                  calendarEventId,
                  alertOffset,
                  triggerTime: new Date(now.getTime() - minutesAgo * 60_000),
                  isDelivered: false,
                  isRead: false,
                  isDeleted: false,
                  modifiedAt: new Date('2025-01-01T00:00:00Z'),
                  syncedAt: null,
                })),
            ),
            { minLength: 1, maxLength: 10 },
          ),
          async (records) => {
            await db.notifications.clear();
            await db.notifications.bulkAdd(records);

            await runCheckCycle();

            const allRecordsAfter = await db.notifications.toArray();

            // All should be delivered regardless of age
            for (const record of allRecordsAfter) {
              expect(record.isDelivered).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 16: Past trigger time soft-deletion after recomputation
   *
   * For any NotificationRecord whose triggerTime is recomputed (due to event start time change),
   * if the new triggerTime ≤ current device UTC time, that record SHALL be soft-deleted
   * (isDeleted = true, modifiedAt = current UTC).
   *
   * Feature: gh12-notifications, Property 16: Past trigger time soft-deletion after recomputation
   *
   * **Validates: Requirements 9.2, 9.3**
   */
  describe('Property 16: Past trigger time soft-deletion after recomputation', () => {
    /**
     * Generates a past ISO date string (2020–2024) for events that are clearly in the past.
     */
    const pastDateArb = fc
      .integer({ min: 2020, max: 2024 })
      .chain((year) =>
        fc.integer({ min: 1, max: 12 }).chain((month) =>
          fc.integer({ min: 1, max: 28 }).map((day) => {
            const m = String(month).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            return `${year}-${m}-${d}`;
          }),
        ),
      );

    it('records whose new triggerTime <= now are soft-deleted after reconciliation with past start time', async () => {
      const eventId = 'event-past-trigger-delete';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          futureDateArb,
          timeMinutesArb,
          pastDateArb,
          timeMinutesArb,
          async (alertOffsets, originalDay, originalTime, newPastDay, newPastTime) => {
            await db.notifications.clear();

            // Step 1: Create records with a FUTURE start time (records will be created)
            const originalEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: originalDay,
              endDay: originalDay,
              startTime: originalTime,
              endTime: Math.min(originalTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(originalEvent);

            // Verify initial records were created
            const initialRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // Only proceed if records were actually created
            if (initialRecords.length === 0) return;

            // Step 2: Reconcile with a PAST start time — all new trigger times will be in the past
            const beforeReconcile = Date.now();

            const updatedEvent: CalendarEvent = {
              ...originalEvent,
              startDay: newPastDay,
              endDay: newPastDay,
              startTime: newPastTime,
              endTime: Math.min(newPastTime + 60, 1439),
              modifiedAt: new Date(),
            };

            await reconcileNotifications(updatedEvent);

            const afterReconcile = Date.now();

            // Step 3: Verify — all records should be soft-deleted since all new trigger times are in the past
            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // No active records should remain — all recomputed trigger times are in the past
            expect(activeRecords.length).toBe(0);

            // The original records should now be soft-deleted
            for (const initialRecord of initialRecords) {
              const rec = await db.notifications.get(initialRecord.id);
              expect(rec).toBeDefined();
              expect(rec!.isDeleted).toBe(true);
              // modifiedAt should be updated
              expect(rec!.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeReconcile);
              expect(rec!.modifiedAt.getTime()).toBeLessThanOrEqual(afterReconcile + 1000);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('only offsets whose recomputed triggerTime <= now are deleted; future offsets survive', async () => {
      const eventId = 'event-partial-past-trigger';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          async (alertOffsets) => {
            await db.notifications.clear();

            // Use a future start time that is close enough that some offsets
            // produce past trigger times and some produce future trigger times.
            // Strategy: use a start time 30 minutes in the future from now.
            // offset=0 → trigger in 30 min (future) ✓
            // offset=10 → trigger in 20 min (future) ✓
            // offset=60 → trigger 30 min ago (past) ✗
            // offset=1440 → trigger ~24h ago (past) ✗
            const now = Date.now();
            const thirtyMinFuture = now + 30 * 60_000;

            // Compute a startDay and startTime from thirtyMinFuture
            const futureDate = new Date(thirtyMinFuture);
            const nearStartDay = futureDate.toISOString().split('T')[0];
            const nearStartTime = futureDate.getUTCHours() * 60 + futureDate.getUTCMinutes();

            const event: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: nearStartDay,
              endDay: nearStartDay,
              startTime: nearStartTime,
              endTime: Math.min(nearStartTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(event);

            const eventStartDateTime = computeEventStartDateTime(nearStartDay, nearStartTime);

            // Check each offset's record status
            const allRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .toArray();

            for (const offset of alertOffsets) {
              const triggerTimeMs = computeTriggerTime(eventStartDateTime, offset);
              const activeRecord = allRecords.find(
                (r) => r.alertOffset === offset && !r.isDeleted,
              );

              if (triggerTimeMs <= now) {
                // Past trigger time: no active record should exist
                expect(activeRecord).toBeUndefined();
              } else {
                // Future trigger time: active record should exist
                expect(activeRecord).toBeDefined();
                expect(activeRecord!.triggerTime.getTime()).toBe(triggerTimeMs);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('when event start moves entirely to the past, all non-delivered records are soft-deleted', async () => {
      const eventId = 'event-full-past-move';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          pastDateArb,
          timeMinutesArb,
          async (alertOffsets, pastDay, pastTime) => {
            await db.notifications.clear();

            // First create records with far future start
            const futureEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: '2035-06-15',
              endDay: '2035-06-15',
              startTime: 720,
              endTime: 780,
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(futureEvent);

            const initialActiveCount = (
              await db.notifications
                .where('calendarEventId')
                .equals(eventId)
                .filter((r) => !r.isDeleted)
                .toArray()
            ).length;

            // Should have created records (start is far future)
            expect(initialActiveCount).toBe(alertOffsets.length);

            // Now move event to the past
            const pastEvent: CalendarEvent = {
              ...futureEvent,
              startDay: pastDay,
              endDay: pastDay,
              startTime: pastTime,
              endTime: Math.min(pastTime + 60, 1439),
              modifiedAt: new Date(),
            };

            await reconcileNotifications(pastEvent);

            // All records should be soft-deleted — event is entirely in the past
            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            expect(activeRecords.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 17: Future restoration creates notifications
   *
   * For any calendar event with alertOffsets that transitions from past start to future start,
   * the system SHALL create new NotificationRecords for each configured alertOffset whose
   * trigger time (new start minus offset) is strictly in the future.
   *
   * Feature: gh12-notifications, Property 17: Future restoration creates notifications
   *
   * **Validates: Requirements 9.5**
   */
  describe('Property 17: Future restoration creates notifications', () => {
    /**
     * Generates a past ISO date string (2020–2024) for events that start in the past.
     */
    const pastDateArb = fc
      .integer({ min: 2020, max: 2024 })
      .chain((year) =>
        fc.integer({ min: 1, max: 12 }).chain((month) =>
          fc.integer({ min: 1, max: 28 }).map((day) => {
            const m = String(month).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            return `${year}-${m}-${d}`;
          }),
        ),
      );

    it('transitioning from past start to future start creates records for offsets with future trigger times', async () => {
      const eventId = 'event-future-restore';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          pastDateArb,
          timeMinutesArb,
          futureDateArb,
          timeMinutesArb,
          async (alertOffsets, pastDay, pastTime, futureDay, futureTime) => {
            await db.notifications.clear();

            // Step 1: Create an event with PAST start time — no records should be created
            const pastEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: pastDay,
              endDay: pastDay,
              startTime: pastTime,
              endTime: Math.min(pastTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(pastEvent);

            // Verify no active records exist (all trigger times are in the past)
            const recordsAfterPast = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            expect(recordsAfterPast.length).toBe(0);

            // Step 2: Reconcile with a FUTURE start time — records should be created
            const futureEvent: CalendarEvent = {
              ...pastEvent,
              startDay: futureDay,
              endDay: futureDay,
              startTime: futureTime,
              endTime: Math.min(futureTime + 60, 1439),
              modifiedAt: new Date(),
            };

            await reconcileNotifications(futureEvent);

            // Step 3: Verify new records are created for offsets whose trigger time is in the future
            const now = Date.now();
            const newEventStartDateTime = computeEventStartDateTime(futureDay, futureTime);

            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // Count how many offsets produce a future trigger time
            const expectedFutureOffsets = alertOffsets.filter((offset) => {
              const triggerTimeMs = computeTriggerTime(newEventStartDateTime, offset);
              return triggerTimeMs > now;
            });

            // Verify correct number of records created
            expect(activeRecords.length).toBe(expectedFutureOffsets.length);

            // Verify each record has correct properties
            for (const record of activeRecords) {
              expect(expectedFutureOffsets).toContain(record.alertOffset);
              const expectedTriggerTime = computeTriggerTime(
                newEventStartDateTime,
                record.alertOffset,
              );
              expect(record.triggerTime.getTime()).toBe(expectedTriggerTime);
              expect(record.isDelivered).toBe(false);
              expect(record.isRead).toBe(false);
              expect(record.isDeleted).toBe(false);
              expect(record.calendarEventId).toBe(eventId);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('restoration from past creates exactly one record per future offset (no duplicates)', async () => {
      const eventId = 'event-restore-no-duplicates';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          pastDateArb,
          timeMinutesArb,
          async (alertOffsets, pastDay, pastTime) => {
            await db.notifications.clear();

            // Start with past event (no records created)
            const pastEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: pastDay,
              endDay: pastDay,
              startTime: pastTime,
              endTime: Math.min(pastTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(pastEvent);

            // Move to far future (all offsets produce future trigger times)
            const futureEvent: CalendarEvent = {
              ...pastEvent,
              startDay: '2035-06-15',
              endDay: '2035-06-15',
              startTime: 720,
              endTime: 780,
              modifiedAt: new Date(),
            };

            // Call reconcile multiple times to verify no duplicates
            await reconcileNotifications(futureEvent);
            await reconcileNotifications(futureEvent);

            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // Should have exactly one record per offset (no duplicates)
            const offsetsInStore = activeRecords.map((r) => r.alertOffset).sort((a, b) => a - b);
            const expectedOffsets = [...alertOffsets].sort((a, b) => a - b);

            expect(offsetsInStore).toEqual(expectedOffsets);
            expect(activeRecords.length).toBe(alertOffsets.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('only offsets whose trigger time is strictly in the future get records created during restoration', async () => {
      const eventId = 'event-restore-partial-future';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 2, maxLength: 4 }),
          pastDateArb,
          timeMinutesArb,
          async (alertOffsets, pastDay, pastTime) => {
            await db.notifications.clear();

            // Start with past event
            const pastEvent: CalendarEvent = {
              id: eventId,
              eventType: 'reminder',
              eventTypeId: 'reminder-type-1',
              startDay: pastDay,
              endDay: pastDay,
              startTime: pastTime,
              endTime: Math.min(pastTime + 60, 1439),
              totalHours: 60,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
              alertOffsets,
            };

            await reconcileNotifications(pastEvent);

            // Move to a time 30 minutes in the future from now
            // This makes offset=0 (trigger at start) and offset=10 (trigger 10 min before)
            // have future trigger times, while offset=60 and offset=1440 have past trigger times
            const now = Date.now();
            const thirtyMinFuture = now + 30 * 60_000;
            const futureDate = new Date(thirtyMinFuture);
            const nearStartDay = futureDate.toISOString().split('T')[0];
            const nearStartTime = futureDate.getUTCHours() * 60 + futureDate.getUTCMinutes();

            const nearFutureEvent: CalendarEvent = {
              ...pastEvent,
              startDay: nearStartDay,
              endDay: nearStartDay,
              startTime: nearStartTime,
              endTime: Math.min(nearStartTime + 60, 1439),
              modifiedAt: new Date(),
            };

            await reconcileNotifications(nearFutureEvent);

            const eventStartDateTime = computeEventStartDateTime(nearStartDay, nearStartTime);

            const activeRecords = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .filter((r) => !r.isDeleted)
              .toArray();

            // Only offsets whose trigger time is > now should have records
            for (const record of activeRecords) {
              const triggerTimeMs = computeTriggerTime(eventStartDateTime, record.alertOffset);
              expect(triggerTimeMs).toBeGreaterThan(now);
            }

            // Offsets whose trigger time <= now should NOT have active records
            for (const offset of alertOffsets) {
              const triggerTimeMs = computeTriggerTime(eventStartDateTime, offset);
              if (triggerTimeMs <= now) {
                const record = activeRecords.find((r) => r.alertOffset === offset);
                expect(record).toBeUndefined();
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
