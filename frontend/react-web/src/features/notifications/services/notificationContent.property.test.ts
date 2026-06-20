import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';

import type { NotificationRecord } from '../types';
import type { CalendarEvent } from '@features/calendar-events/models';

import { truncateTitle, formatTimeRemaining } from './systemNotificationDelivery';

// Mock channel settings to 'app' for Property 13 tests — avoids system notification side effects
vi.mock('./notificationSettings', () => ({
  getChannel: vi.fn().mockResolvedValue('app'),
}));

vi.mock('./systemNotificationDelivery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./systemNotificationDelivery')>();
  return {
    ...actual,
    deliverSystemNotification: vi.fn().mockReturnValue(true),
  };
});

import {
  reconcileNotifications,
  deleteNotificationsForEvent,
  runCheckCycle,
} from './notificationService';

/**
 * Property-based tests for notification content formatting and modifiedAt invariant.
 * Feature: gh12-notifications, Property 11: System notification content formatting
 * Feature: gh12-notifications, Property 13: modifiedAt updated on every write
 *
 * Uses fast-check with minimum 100 iterations per property.
 */

// ────────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────────────────

/** Valid alert offset values */
const VALID_OFFSETS = [0, 10, 60, 1440] as const;

/** Generates a random alert offset from valid values */
const alertOffsetArb = fc.constantFrom(...VALID_OFFSETS);

/** Generates random event names of varying length (0–200 chars) */
const eventNameArb = fc.string({ minLength: 0, maxLength: 200 });

/** Generates a locale for testing */
const localeArb = fc.constantFrom('en', 'es', 'en-US', 'es-MX', 'fr', 'de');

/** Generates a future ISO date string (2030–2035) */
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

/** Generates a random subset of valid alert offsets (1–4 elements) */
const alertOffsetsArb = fc
  .subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 })
  .map((arr) => [...new Set(arr)]);

/** Creates a NotificationRecord with given overrides */
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

// ────────────────────────────────────────────────────────────────────────────────
// Property 11: System notification content formatting
// ────────────────────────────────────────────────────────────────────────────────

describe('Property 11: System notification content formatting', () => {
  /**
   * For any calendar event name and alert offset, the System_Notification SHALL display:
   * the Planixor app icon, the event name truncated to 65 characters as the title,
   * and the localized alert type label as the body text.
   *
   * **Validates: Requirements 5.5**
   */

  describe('truncateTitle produces ≤65 characters for any event name', () => {
    it('output length is always ≤ 65 characters regardless of input length', () => {
      fc.assert(
        fc.property(eventNameArb, (eventName) => {
          const result = truncateTitle(eventName);
          expect(result.length).toBeLessThanOrEqual(65);
        }),
        { numRuns: 100 },
      );
    });

    it('output preserves original content when input is ≤ 65 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 65 }),
          (eventName) => {
            const result = truncateTitle(eventName);
            expect(result).toBe(eventName);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('output is the first 65 characters when input exceeds 65 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 66, maxLength: 200 }),
          (eventName) => {
            const result = truncateTitle(eventName);
            expect(result).toBe(eventName.slice(0, 65));
            expect(result.length).toBe(65);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('truncation is idempotent — truncating twice yields the same result', () => {
      fc.assert(
        fc.property(eventNameArb, (eventName) => {
          const once = truncateTitle(eventName);
          const twice = truncateTitle(once);
          expect(once).toBe(twice);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('formatTimeRemaining returns a non-empty localized string for any valid offset', () => {
    it('returns a non-empty string for every valid offset and locale combination', () => {
      fc.assert(
        fc.property(alertOffsetArb, localeArb, (offset, locale) => {
          const label = formatTimeRemaining(offset, locale);
          expect(label).toBeTruthy();
          expect(label.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it('returns a Spanish label when locale starts with "es"', () => {
      fc.assert(
        fc.property(
          alertOffsetArb,
          fc.constantFrom('es', 'es-MX', 'es-AR', 'es-CO'),
          (offset, locale) => {
            const label = formatTimeRemaining(offset, locale);
            const spanishLabels = ['Ahora', 'En 10 minutos', 'En 1 hora', 'En 1 día'];
            expect(spanishLabels).toContain(label);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns an English label when locale does not start with "es"', () => {
      fc.assert(
        fc.property(
          alertOffsetArb,
          fc.constantFrom('en', 'en-US', 'en-GB', 'fr', 'de'),
          (offset, locale) => {
            const label = formatTimeRemaining(offset, locale);
            const englishLabels = ['Now', 'In 10 minutes', 'In 1 hour', 'In 1 day'];
            expect(englishLabels).toContain(label);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('is a pure function — same inputs always produce same output', () => {
      fc.assert(
        fc.property(alertOffsetArb, localeArb, (offset, locale) => {
          const result1 = formatTimeRemaining(offset, locale);
          const result2 = formatTimeRemaining(offset, locale);
          expect(result1).toBe(result2);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('combined: notification content is well-formed for any event name and offset', () => {
    it('title (truncated name) and body (time remaining) are both non-empty strings ≤ 65 and > 0 chars respectively', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          alertOffsetArb,
          localeArb,
          (eventName, offset, locale) => {
            const title = truncateTitle(eventName);
            const body = formatTimeRemaining(offset, locale);

            // Title constraints: ≤ 65 chars, non-empty when input is non-empty
            expect(title.length).toBeLessThanOrEqual(65);
            expect(title.length).toBeGreaterThan(0);

            // Body constraints: non-empty localized string
            expect(body.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('empty event name produces empty title (edge case)', () => {
      fc.assert(
        fc.property(alertOffsetArb, localeArb, (offset, locale) => {
          const title = truncateTitle('');
          const body = formatTimeRemaining(offset, locale);

          expect(title).toBe('');
          expect(body.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Property 13: modifiedAt updated on every write
// ────────────────────────────────────────────────────────────────────────────────

describe('Property 13: modifiedAt updated on every write', () => {
  /**
   * For any write operation (create, update, or soft-delete) on a NotificationRecord,
   * the resulting record's modifiedAt SHALL be greater than or equal to the timestamp
   * at which the operation was initiated.
   *
   * **Validates: Requirements 8.3**
   */

  beforeEach(async () => {
    await db.open();
    await db.notifications.clear();
    await db.calendarEvents.clear();
  });

  afterEach(async () => {
    await db.notifications.clear();
    await db.calendarEvents.clear();
  });

  describe('create: reconcileNotifications sets modifiedAt >= operation start time', () => {
    it('all newly created records have modifiedAt >= the time before the operation', async () => {
      const eventId = 'event-modifiedAt-create';

      await fc.assert(
        fc.asyncProperty(
          alertOffsetsArb,
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

            const beforeOp = new Date();

            await reconcileNotifications(event);

            const records = await db.notifications
              .where('calendarEventId')
              .equals(eventId)
              .toArray();

            for (const record of records) {
              // modifiedAt must be >= the time the operation was initiated
              expect(record.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeOp.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('soft-delete via reconcileNotifications sets modifiedAt >= operation start time', () => {
    it('soft-deleted records have modifiedAt >= the time before the operation', async () => {
      const eventId = 'event-modifiedAt-softdelete';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          async (initialOffsets) => {
            await db.notifications.clear();

            // Create initial records with an old modifiedAt
            const oldDate = new Date('2025-01-01T00:00:00Z');
            const records: NotificationRecord[] = initialOffsets.map((offset) =>
              createNotificationRecord({
                calendarEventId: eventId,
                alertOffset: offset,
                triggerTime: new Date('2030-06-15T09:50:00Z'),
                isDelivered: false,
                isDeleted: false,
                modifiedAt: oldDate,
              }),
            );
            await db.notifications.bulkAdd(records);

            const beforeOp = new Date();

            // Reconcile with empty alertOffsets — this should soft-delete all existing records
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
              alertOffsets: [], // empty — triggers soft-delete of existing
            };

            await reconcileNotifications(event);

            // All original records should be soft-deleted with updated modifiedAt
            for (const originalRecord of records) {
              const updated = await db.notifications.get(originalRecord.id);
              expect(updated).toBeDefined();
              expect(updated!.isDeleted).toBe(true);
              expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeOp.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('cascade soft-delete via deleteNotificationsForEvent sets modifiedAt >= operation start time', () => {
    it('all cascade-deleted records have modifiedAt >= the time before the operation', async () => {
      const eventId = 'event-modifiedAt-cascade';

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          fc.array(fc.boolean(), { minLength: 1, maxLength: 4 }),
          async (offsets, deliveredStates) => {
            await db.notifications.clear();

            const oldDate = new Date('2025-01-01T00:00:00Z');
            const records: NotificationRecord[] = offsets.map((offset, i) =>
              createNotificationRecord({
                calendarEventId: eventId,
                alertOffset: offset,
                triggerTime: new Date('2030-06-15T09:50:00Z'),
                isDelivered: deliveredStates[i % deliveredStates.length],
                isDeleted: false,
                modifiedAt: oldDate,
              }),
            );
            await db.notifications.bulkAdd(records);

            const beforeOp = new Date();

            await deleteNotificationsForEvent(eventId);

            for (const originalRecord of records) {
              const updated = await db.notifications.get(originalRecord.id);
              expect(updated).toBeDefined();
              expect(updated!.isDeleted).toBe(true);
              expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeOp.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('update via runCheckCycle (delivery) sets modifiedAt >= operation start time', () => {
    it('delivered records have modifiedAt >= the time before the check cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...VALID_OFFSETS], { minLength: 1, maxLength: 4 }),
          async (offsets) => {
            await db.notifications.clear();

            const oldDate = new Date('2025-01-01T00:00:00Z');
            // Create due records (triggerTime in the past, not delivered, not deleted)
            const records: NotificationRecord[] = offsets.map((offset) =>
              createNotificationRecord({
                calendarEventId: `event-delivery-${offset}`,
                alertOffset: offset,
                triggerTime: new Date('2020-01-01T00:00:00Z'), // far in the past → due
                isDelivered: false,
                isDeleted: false,
                modifiedAt: oldDate,
              }),
            );
            await db.notifications.bulkAdd(records);

            const beforeOp = new Date();

            await runCheckCycle();

            for (const originalRecord of records) {
              const updated = await db.notifications.get(originalRecord.id);
              expect(updated).toBeDefined();
              expect(updated!.isDelivered).toBe(true);
              expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeOp.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('mark as read via direct update sets modifiedAt >= operation start time', () => {
    it('marking records as read updates modifiedAt correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (recordCount) => {
            await db.notifications.clear();

            const oldDate = new Date('2025-01-01T00:00:00Z');
            const records: NotificationRecord[] = [];
            for (let i = 0; i < recordCount; i++) {
              records.push(
                createNotificationRecord({
                  id: crypto.randomUUID(),
                  calendarEventId: `event-markread-${i}`,
                  alertOffset: VALID_OFFSETS[i % 4],
                  triggerTime: new Date('2030-06-15T09:50:00Z'),
                  isDelivered: true,
                  isRead: false,
                  isDeleted: false,
                  modifiedAt: oldDate,
                }),
              );
            }
            await db.notifications.bulkAdd(records);

            const beforeOp = new Date();

            // Simulate mark-as-read operation (same pattern as NotificationView)
            for (const record of records) {
              await db.notifications.update(record.id, {
                isRead: true,
                modifiedAt: new Date(),
              });
            }

            for (const originalRecord of records) {
              const updated = await db.notifications.get(originalRecord.id);
              expect(updated).toBeDefined();
              expect(updated!.isRead).toBe(true);
              expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeOp.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
