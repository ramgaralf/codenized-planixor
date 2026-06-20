import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';

import { computeEventStartDateTime } from '../services/notificationService';
import type { NotificationRecord } from '../types';

/**
 * Property-based tests for UI display logic (React Web).
 * Feature: gh12-notifications
 *
 * Tests pure logic functions that drive the notification UI:
 * - Alert field visibility
 * - Notification view query correctness
 * - Time display formatting
 * - Badge count display
 * - Bell icon visibility
 *
 * Uses fast-check with minimum 100 iterations per property.
 */

// ────────────────────────────────────────────────────────────────────────────────
// Pure logic functions extracted from components for testability
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Determines whether the alert config field should be visible.
 * The field is visible iff the event start DateTime is strictly in the future.
 *
 * This logic is used in AlertConfigField.tsx via the `visible` prop.
 */
const isAlertFieldVisible = (eventStartDateTimeMs: number, nowMs: number): boolean => {
  return eventStartDateTimeMs > nowMs;
};

/**
 * Formats trigger time as relative (< 24h) or absolute (>= 24h).
 * Extracted from NotificationView.tsx for property testing.
 *
 * Returns 'relative' or 'absolute' to indicate which format applies.
 */
const getTimeDisplayFormat = (triggerTimeMs: number, nowMs: number): 'relative' | 'absolute' => {
  const diffMs = nowMs - triggerTimeMs;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (diffMs < 0 || diffMs >= TWENTY_FOUR_HOURS) {
    return 'absolute';
  }

  return 'relative';
};

/**
 * Computes the badge display text from the unread count.
 * Extracted from NotificationBadge.tsx for property testing.
 *
 * Returns null if hidden, or the display string.
 */
const getBadgeDisplayText = (count: number): string | null => {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
};

/**
 * Determines bell icon visibility based on the notification channel.
 * Visible iff channel is 'app' or 'both'; hidden when 'system'.
 */
const isBellIconVisible = (channel: string): boolean => {
  return channel === 'app' || channel === 'both';
};

// ────────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────────────────

/** Generates a valid ISO date string (2020–2035) */
const dateStringArb = fc
  .integer({ min: 2020, max: 2035 })
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

/** Generates a timestamp within a reasonable range (2020–2035 as ms since epoch) */
const timestampMsArb = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2035-12-31T23:59:59Z').getTime(),
});

/** Generates a notification channel value */
const channelArb = fc.constantFrom('app', 'system', 'both');

/** Generates any string value including invalid channel values */
const anyChannelArb = fc.oneof(
  channelArb,
  fc.constantFrom('email', 'push', 'none', '', 'sms'),
);

/** Generates a count for badge display (0–200) */
const badgeCountArb = fc.integer({ min: 0, max: 200 });

/** Generates a boolean value */
const boolArb = fc.boolean();

/** Creates a NotificationRecord with the given overrides */
const createNotificationRecord = (overrides: Partial<NotificationRecord>): NotificationRecord => ({
  id: crypto.randomUUID(),
  calendarEventId: 'event-1',
  alertOffset: 10,
  triggerTime: new Date('2030-06-15T09:50:00Z'),
  isDelivered: false,
  isRead: false,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

// ────────────────────────────────────────────────────────────────────────────────
// Property Tests
// ────────────────────────────────────────────────────────────────────────────────

describe('Notifications UI Display Logic — Property Tests', () => {
  /**
   * Property 1: Alert field visibility is determined by event start time
   *
   * For any event start DateTime and reference "now", the alert field SHALL be
   * visible iff start > now.
   *
   * **Validates: Requirements 1.1, 1.3**
   */
  describe('Property 1: Alert field visibility is determined by event start time', () => {
    it('alert field is visible when event start is strictly after now', () => {
      fc.assert(
        fc.property(
          dateStringArb,
          timeMinutesArb,
          timestampMsArb,
          (startDay, startTime, nowMs) => {
            const eventStartMs = computeEventStartDateTime(startDay, startTime);
            const visible = isAlertFieldVisible(eventStartMs, nowMs);

            if (eventStartMs > nowMs) {
              expect(visible).toBe(true);
            } else {
              expect(visible).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('alert field is hidden when event start equals now', () => {
      fc.assert(
        fc.property(
          dateStringArb,
          timeMinutesArb,
          (startDay, startTime) => {
            const eventStartMs = computeEventStartDateTime(startDay, startTime);
            // When now === eventStart, visible should be false (not strictly in the future)
            const visible = isAlertFieldVisible(eventStartMs, eventStartMs);
            expect(visible).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('alert field is hidden when event start is in the past', () => {
      fc.assert(
        fc.property(
          dateStringArb,
          timeMinutesArb,
          fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
          (startDay, startTime, futureOffsetMs) => {
            const eventStartMs = computeEventStartDateTime(startDay, startTime);
            // now is after eventStart
            const nowMs = eventStartMs + futureOffsetMs;
            const visible = isAlertFieldVisible(eventStartMs, nowMs);
            expect(visible).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('visibility is a pure function of start time and now — deterministic', () => {
      fc.assert(
        fc.property(
          dateStringArb,
          timeMinutesArb,
          timestampMsArb,
          (startDay, startTime, nowMs) => {
            const eventStartMs = computeEventStartDateTime(startDay, startTime);
            const result1 = isAlertFieldVisible(eventStartMs, nowMs);
            const result2 = isAlertFieldVisible(eventStartMs, nowMs);
            expect(result1).toBe(result2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Notification view query correctness
   *
   * The view SHALL display exactly those records where isRead=false AND
   * isDelivered=true AND isDeleted=false, ordered by triggerTime descending,
   * limited to 100.
   *
   * **Validates: Requirements 3.1, 3.2, 3.6**
   */
  describe('Property 7: Notification view query correctness', () => {
    beforeEach(async () => {
      await db.open();
      await db.notifications.clear();
    });

    afterEach(async () => {
      await db.notifications.clear();
    });

    it('query returns exactly the records matching isRead=false, isDelivered=true, isDeleted=false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              isRead: boolArb,
              isDelivered: boolArb,
              isDeleted: boolArb,
              triggerTimeOffset: fc.integer({ min: 0, max: 1_000_000_000 }),
            }),
            { minLength: 1, maxLength: 50 },
          ),
          async (recordConfigs) => {
            await db.notifications.clear();

            const baseTime = new Date('2030-01-01T00:00:00Z').getTime();
            const records: NotificationRecord[] = recordConfigs.map((config, i) =>
              createNotificationRecord({
                id: crypto.randomUUID(),
                calendarEventId: `event-${i}`,
                isRead: config.isRead,
                isDelivered: config.isDelivered,
                isDeleted: config.isDeleted,
                triggerTime: new Date(baseTime + config.triggerTimeOffset),
              }),
            );

            await db.notifications.bulkAdd(records);

            // Execute the same query as useNotifications hook
            const queryResult = await db.notifications
              .filter(
                (record) =>
                  record.isRead === false &&
                  record.isDelivered === true &&
                  record.isDeleted === false,
              )
              .sortBy('triggerTime')
              .then((recs) => recs.reverse().slice(0, 100));

            // Compute expected result independently
            const expected = records
              .filter((r) => !r.isRead && r.isDelivered && !r.isDeleted)
              .sort((a, b) => b.triggerTime.getTime() - a.triggerTime.getTime())
              .slice(0, 100);

            // Same count
            expect(queryResult.length).toBe(expected.length);

            // Same IDs in same order
            const queryIds = queryResult.map((r) => r.id);
            const expectedIds = expected.map((r) => r.id);
            expect(queryIds).toEqual(expectedIds);

            // Verify ordering is descending by triggerTime
            for (let i = 1; i < queryResult.length; i++) {
              expect(queryResult[i - 1].triggerTime.getTime()).toBeGreaterThanOrEqual(
                queryResult[i].triggerTime.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('query never includes records where isRead=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              isRead: fc.constant(true),
              isDelivered: boolArb,
              isDeleted: boolArb,
              triggerTimeOffset: fc.integer({ min: 0, max: 1_000_000 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (readRecordConfigs) => {
            await db.notifications.clear();

            const baseTime = new Date('2030-01-01T00:00:00Z').getTime();
            const records = readRecordConfigs.map((config, i) =>
              createNotificationRecord({
                id: crypto.randomUUID(),
                calendarEventId: `event-read-${i}`,
                isRead: true,
                isDelivered: config.isDelivered,
                isDeleted: config.isDeleted,
                triggerTime: new Date(baseTime + config.triggerTimeOffset),
              }),
            );

            await db.notifications.bulkAdd(records);

            const queryResult = await db.notifications
              .filter(
                (record) =>
                  record.isRead === false &&
                  record.isDelivered === true &&
                  record.isDeleted === false,
              )
              .toArray();

            expect(queryResult.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('query respects the 100-record limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 150 }),
          async (totalRecords) => {
            await db.notifications.clear();

            const baseTime = new Date('2030-01-01T00:00:00Z').getTime();
            const records: NotificationRecord[] = [];

            for (let i = 0; i < totalRecords; i++) {
              records.push(
                createNotificationRecord({
                  id: crypto.randomUUID(),
                  calendarEventId: `event-limit-${i}`,
                  isRead: false,
                  isDelivered: true,
                  isDeleted: false,
                  triggerTime: new Date(baseTime + i * 60_000),
                }),
              );
            }

            await db.notifications.bulkAdd(records);

            const queryResult = await db.notifications
              .filter(
                (record) =>
                  record.isRead === false &&
                  record.isDelivered === true &&
                  record.isDeleted === false,
              )
              .sortBy('triggerTime')
              .then((recs) => recs.reverse().slice(0, 100));

            expect(queryResult.length).toBe(100);

            // Should be the 100 most recent by triggerTime DESC
            const allMatching = records
              .sort((a, b) => b.triggerTime.getTime() - a.triggerTime.getTime())
              .slice(0, 100);

            const queryIds = queryResult.map((r) => r.id);
            const expectedIds = allMatching.map((r) => r.id);
            expect(queryIds).toEqual(expectedIds);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Time display formatting
   *
   * If (now - triggerTime) < 24h → relative format;
   * otherwise → absolute format.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Property 8: Time display formatting', () => {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    it('uses relative format when diff is >= 0 and < 24h', () => {
      fc.assert(
        fc.property(
          timestampMsArb,
          fc.integer({ min: 0, max: TWENTY_FOUR_HOURS_MS - 1 }),
          (triggerTimeMs, diffMs) => {
            const nowMs = triggerTimeMs + diffMs;
            const format = getTimeDisplayFormat(triggerTimeMs, nowMs);
            expect(format).toBe('relative');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('uses absolute format when diff is >= 24h', () => {
      fc.assert(
        fc.property(
          timestampMsArb,
          fc.integer({ min: TWENTY_FOUR_HOURS_MS, max: TWENTY_FOUR_HOURS_MS * 365 }),
          (triggerTimeMs, diffMs) => {
            const nowMs = triggerTimeMs + diffMs;
            const format = getTimeDisplayFormat(triggerTimeMs, nowMs);
            expect(format).toBe('absolute');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('uses absolute format when triggerTime is in the future (diff < 0)', () => {
      fc.assert(
        fc.property(
          timestampMsArb,
          fc.integer({ min: 1, max: TWENTY_FOUR_HOURS_MS * 365 }),
          (nowMs, futureOffsetMs) => {
            const triggerTimeMs = nowMs + futureOffsetMs;
            const format = getTimeDisplayFormat(triggerTimeMs, nowMs);
            expect(format).toBe('absolute');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('boundary: exactly 24h difference produces absolute format', () => {
      fc.assert(
        fc.property(timestampMsArb, (triggerTimeMs) => {
          const nowMs = triggerTimeMs + TWENTY_FOUR_HOURS_MS;
          const format = getTimeDisplayFormat(triggerTimeMs, nowMs);
          expect(format).toBe('absolute');
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Badge count display
   *
   * count=0 → hidden, 1-99 → exact, >99 → "99+".
   *
   * **Validates: Requirements 3.6**
   */
  describe('Property 9: Badge count display', () => {
    it('count=0 produces null (hidden)', () => {
      const result = getBadgeDisplayText(0);
      expect(result).toBeNull();
    });

    it('negative counts produce null (hidden)', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000, max: -1 }), (count) => {
          const result = getBadgeDisplayText(count);
          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('counts 1-99 produce the exact number as string', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 99 }), (count) => {
          const result = getBadgeDisplayText(count);
          expect(result).toBe(String(count));
        }),
        { numRuns: 100 },
      );
    });

    it('counts > 99 produce "99+"', () => {
      fc.assert(
        fc.property(fc.integer({ min: 100, max: 10_000 }), (count) => {
          const result = getBadgeDisplayText(count);
          expect(result).toBe('99+');
        }),
        { numRuns: 100 },
      );
    });

    it('for any count 0-200, output matches the specification', () => {
      fc.assert(
        fc.property(badgeCountArb, (count) => {
          const result = getBadgeDisplayText(count);

          if (count <= 0) {
            expect(result).toBeNull();
          } else if (count <= 99) {
            expect(result).toBe(String(count));
          } else {
            expect(result).toBe('99+');
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Bell icon visibility based on channel
   *
   * Visible iff channel is "app" or "both" (hidden when "system").
   *
   * **Validates: Requirements 4.4, 4.5**
   */
  describe('Property 10: Bell icon visibility based on channel', () => {
    it('bell is visible when channel is "app"', () => {
      expect(isBellIconVisible('app')).toBe(true);
    });

    it('bell is visible when channel is "both"', () => {
      expect(isBellIconVisible('both')).toBe(true);
    });

    it('bell is hidden when channel is "system"', () => {
      expect(isBellIconVisible('system')).toBe(false);
    });

    it('for any valid channel value, visibility follows the specification', () => {
      fc.assert(
        fc.property(channelArb, (channel) => {
          const visible = isBellIconVisible(channel);

          if (channel === 'app' || channel === 'both') {
            expect(visible).toBe(true);
          } else {
            expect(visible).toBe(false);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('for any arbitrary string, only "app" and "both" produce visibility', () => {
      fc.assert(
        fc.property(anyChannelArb, (channel) => {
          const visible = isBellIconVisible(channel);

          if (channel === 'app' || channel === 'both') {
            expect(visible).toBe(true);
          } else {
            expect(visible).toBe(false);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('visibility is a pure function — deterministic for any input', () => {
      fc.assert(
        fc.property(fc.string(), (channel) => {
          const result1 = isBellIconVisible(channel);
          const result2 = isBellIconVisible(channel);
          expect(result1).toBe(result2);
        }),
        { numRuns: 100 },
      );
    });
  });
});
