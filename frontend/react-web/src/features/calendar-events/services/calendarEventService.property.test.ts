import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';

import { create, update, softDelete, getByDate, getByDateRange } from './calendarEventService';

import type { CreateCalendarEventInput } from './calendarEventService';
import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

/**
 * Property-based tests for calendarEventService.
 * Feature: gh8-calendar-event-management
 */

/** Generates a valid ISO date string (YYYY-MM-DD) */
const isoDateArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
      }),
    ),
  );

const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

const SAMPLE_COLORS = [
  '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#991B1B',
  '#6EE7B7', '#34D399', '#10B981', '#059669', '#065F46',
  '#93C5FD', '#60A5FA', '#2563EB', '#1D4ED8', '#1E3A8A',
];

/** Generates a valid time pair where endTime > startTime */
const validTimePairArb = fc
  .integer({ min: 0, max: 1438 })
  .chain((start) =>
    fc.integer({ min: start + 1, max: 1439 }).map((end) => ({ startTime: start, endTime: end })),
  );

/** Generates a valid CreateCalendarEventInput for a reminder type (no one-shift-per-day constraint) */
const validReminderInputArb: fc.Arbitrary<CreateCalendarEventInput> = fc
  .tuple(isoDateArb, validTimePairArb, fc.uuid(), fc.oneof(fc.constant(null), fc.string({ maxLength: 250 })))
  .map(([startDay, times, eventTypeId, notes]) => ({
    eventType: 'reminder' as const,
    eventTypeId,
    startDay,
    endDay: startDay,
    startTime: times.startTime,
    endTime: times.endTime,
    notes,
  }));

/** Generates a valid Shift entity for seeding into the database */
const shiftEntityArb = (id?: string): fc.Arbitrary<Shift> =>
  fc.record({
    id: id ? fc.constant(id) : fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' }).filter((s) => s.trim().length >= 1),
    icon: fc.constantFrom(...SINGLE_EMOJIS),
    backgroundColor: fc.constantFrom(...SAMPLE_COLORS),
    startTime: fc.integer({ min: 0, max: 1438 }),
    endTime: fc.integer({ min: 1, max: 1439 }),
    hoursWorked: fc.integer({ min: 1, max: 1440 }),
    isActive: fc.constant(true),
    createdAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
    modifiedAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
    syncedAt: fc.constant(null),
    isDeleted: fc.constant(false),
  });

/** Generates a valid Reminder entity for seeding into the database */
const reminderEntityArb = (id?: string): fc.Arbitrary<Reminder> =>
  fc.record({
    id: id ? fc.constant(id) : fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' }).filter((s) => s.trim().length >= 1),
    icon: fc.constantFrom(...SINGLE_EMOJIS),
    backgroundColor: fc.constantFrom(...SAMPLE_COLORS),
    isActive: fc.constant(true),
    createdAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
    modifiedAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
    syncedAt: fc.constant(null),
    isDeleted: fc.constant(false),
  });

describe('calendarEventService — Property Tests', () => {
  beforeEach(async () => {
    await db.open();
    await db.calendarEvents.clear();
    await db.shifts.clear();
    await db.reminders.clear();
  });

  afterEach(async () => {
    await db.calendarEvents.clear();
    await db.shifts.clear();
    await db.reminders.clear();
  });

  /**
   * Property 1: Write operations update change tracking fields
   *
   * For any calendar event and any local write operation (create, update, or soft-delete),
   * the resulting record SHALL have `modifiedAt` set to the current UTC timestamp
   * and `syncedAt` set to null.
   *
   * **Validates: Requirements 1.1, 7.2, 8.2, 11.4**
   */
  describe('Property 1: Write operations update change tracking fields', () => {
    it('create: should set modifiedAt to a recent timestamp and syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(validReminderInputArb, async (input) => {
          await db.calendarEvents.clear();

          const before = new Date();
          const event = await create(input);

          expect(event.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(event.modifiedAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
          expect(event.syncedAt).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('update: should reset modifiedAt to a recent timestamp and syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(
          validReminderInputArb,
          fc.oneof(fc.constant(null), fc.string({ maxLength: 250 })),
          async (input, newNotes) => {
            await db.calendarEvents.clear();

            const event = await create(input);

            // Simulate a previously-synced state by manually setting syncedAt
            await db.calendarEvents.update(event.id, {
              syncedAt: new Date('2024-06-01T00:00:00Z'),
            });

            const before = new Date();
            const updated = await update(event.id, { notes: newNotes });

            expect(updated.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(updated.modifiedAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
            expect(updated.syncedAt).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('softDelete: should update modifiedAt to a recent timestamp and set syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(validReminderInputArb, async (input) => {
          await db.calendarEvents.clear();

          const event = await create(input);

          // Simulate previously-synced state
          await db.calendarEvents.update(event.id, {
            syncedAt: new Date('2024-06-01T00:00:00Z'),
          });

          const before = new Date();
          await softDelete(event.id);

          const deleted = await db.calendarEvents.get(event.id);
          expect(deleted).toBeDefined();
          expect(deleted!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(deleted!.modifiedAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
          expect(deleted!.syncedAt).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('softDelete: should set isDeleted to true', async () => {
      await fc.assert(
        fc.asyncProperty(validReminderInputArb, async (input) => {
          await db.calendarEvents.clear();

          const event = await create(input);
          await softDelete(event.id);

          const deleted = await db.calendarEvents.get(event.id);
          expect(deleted).toBeDefined();
          expect(deleted!.isDeleted).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Display fields derived from referenced entity at read time
   *
   * For any calendar event referencing a shift or reminder by eventTypeId,
   * the derived display fields (name, icon, backgroundColor) SHALL equal the
   * corresponding fields of the currently stored shift or reminder definition.
   *
   * **Validates: Requirements 1.4, 11.2**
   */
  describe('Property 5: Display fields derived from referenced entity at read time', () => {
    it('should derive display fields from the referenced shift definition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          shiftEntityArb(),
          validTimePairArb,
          isoDateArb,
          async (eventTypeId, shiftTemplate, times, startDay) => {
            await db.calendarEvents.clear();
            await db.shifts.clear();

            const shift: Shift = { ...shiftTemplate, id: eventTypeId };
            await db.shifts.add(shift);

            await create({
              eventType: 'shift',
              eventTypeId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            const results = await getByDate(startDay);

            expect(results.length).toBe(1);
            expect(results[0].name).toBe(shift.name);
            expect(results[0].icon).toBe(shift.icon);
            expect(results[0].backgroundColor).toBe(shift.backgroundColor);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should derive display fields from the referenced reminder definition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          reminderEntityArb(),
          validTimePairArb,
          isoDateArb,
          async (eventTypeId, reminderTemplate, times, startDay) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder: Reminder = { ...reminderTemplate, id: eventTypeId };
            await db.reminders.add(reminder);

            await create({
              eventType: 'reminder',
              eventTypeId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            const results = await getByDate(startDay);

            expect(results.length).toBe(1);
            expect(results[0].name).toBe(reminder.name);
            expect(results[0].icon).toBe(reminder.icon);
            expect(results[0].backgroundColor).toBe(reminder.backgroundColor);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use fallback values when referenced entity does not exist (orphaned reference)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('shift' as const, 'reminder' as const),
          fc.uuid(),
          validTimePairArb,
          isoDateArb,
          async (eventType, orphanedId, times, startDay) => {
            await db.calendarEvents.clear();
            await db.shifts.clear();
            await db.reminders.clear();

            await create({
              eventType,
              eventTypeId: orphanedId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            const results = await getByDate(startDay);

            expect(results.length).toBe(1);
            expect(results[0].name).toBe('[Deleted]');
            expect(results[0].icon).toBe('❓');
            expect(results[0].backgroundColor).toBe('transparent');
            expect(results[0].isOrphaned).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reflect updated entity values when entity is modified after event creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          shiftEntityArb(),
          shiftEntityArb(),
          validTimePairArb,
          isoDateArb,
          async (eventTypeId, originalShift, updatedShiftTemplate, times, startDay) => {
            await db.calendarEvents.clear();
            await db.shifts.clear();

            const shift: Shift = { ...originalShift, id: eventTypeId };
            await db.shifts.add(shift);

            await create({
              eventType: 'shift',
              eventTypeId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            // Update the shift definition after event creation
            const updatedShift: Shift = { ...updatedShiftTemplate, id: eventTypeId };
            await db.shifts.put(updatedShift);

            const results = await getByDate(startDay);

            expect(results.length).toBe(1);
            expect(results[0].name).toBe(updatedShift.name);
            expect(results[0].icon).toBe(updatedShift.icon);
            expect(results[0].backgroundColor).toBe(updatedShift.backgroundColor);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 15: Referential protection prevents physical deletion of referenced entities
   *
   * Note: The calendarEventService doesn't implement referential protection itself
   * (that would be in shift/reminder services). This test verifies the service
   * correctly derives display fields when entities exist and handles missing
   * references gracefully with fallback values.
   *
   * For any shift or reminder referenced by at least one non-deleted calendar event,
   * the display fields resolve correctly. When the reference is orphaned (entity was deleted),
   * the fallback values are used.
   *
   * **Validates: Requirements 11.2**
   */
  describe('Property 15: Referential protection — display field resolution and fallback', () => {
    it('should resolve display fields when referenced entity exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('shift' as const, 'reminder' as const),
          shiftEntityArb(),
          reminderEntityArb(),
          validTimePairArb,
          isoDateArb,
          async (entityId, eventType, shiftData, reminderData, times, startDay) => {
            await db.calendarEvents.clear();
            await db.shifts.clear();
            await db.reminders.clear();

            if (eventType === 'shift') {
              const shift: Shift = { ...shiftData, id: entityId };
              await db.shifts.add(shift);
            } else {
              const reminder: Reminder = { ...reminderData, id: entityId };
              await db.reminders.add(reminder);
            }

            await create({
              eventType,
              eventTypeId: entityId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            const results = await getByDate(startDay);
            expect(results.length).toBe(1);

            if (eventType === 'shift') {
              expect(results[0].name).toBe(shiftData.name);
              expect(results[0].icon).toBe(shiftData.icon);
              expect(results[0].backgroundColor).toBe(shiftData.backgroundColor);
            } else {
              expect(results[0].name).toBe(reminderData.name);
              expect(results[0].icon).toBe(reminderData.icon);
              expect(results[0].backgroundColor).toBe(reminderData.backgroundColor);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use fallback values when referenced entity is physically removed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('shift' as const, 'reminder' as const),
          shiftEntityArb(),
          reminderEntityArb(),
          validTimePairArb,
          isoDateArb,
          async (entityId, eventType, shiftData, reminderData, times, startDay) => {
            await db.calendarEvents.clear();
            await db.shifts.clear();
            await db.reminders.clear();

            // Add entity, create event, then physically delete entity
            if (eventType === 'shift') {
              const shift: Shift = { ...shiftData, id: entityId };
              await db.shifts.add(shift);
            } else {
              const reminder: Reminder = { ...reminderData, id: entityId };
              await db.reminders.add(reminder);
            }

            await create({
              eventType,
              eventTypeId: entityId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            // Physically delete the referenced entity (simulating corruption/improper deletion)
            if (eventType === 'shift') {
              await db.shifts.delete(entityId);
            } else {
              await db.reminders.delete(entityId);
            }

            const results = await getByDate(startDay);
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('[Deleted]');
            expect(results[0].icon).toBe('❓');
            expect(results[0].backgroundColor).toBe('transparent');
            expect(results[0].isOrphaned).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly derive display fields via getByDateRange', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          shiftEntityArb(),
          validTimePairArb,
          async (entityId, shiftData, times) => {
            await db.calendarEvents.clear();
            await db.shifts.clear();

            const startDay = '2024-06-15';
            const shift: Shift = { ...shiftData, id: entityId };
            await db.shifts.add(shift);

            await create({
              eventType: 'shift',
              eventTypeId: entityId,
              startDay,
              endDay: startDay,
              startTime: times.startTime,
              endTime: times.endTime,
              notes: null,
            });

            const results = await getByDateRange('2024-06-01', '2024-06-30');

            expect(results.length).toBe(1);
            expect(results[0].name).toBe(shift.name);
            expect(results[0].icon).toBe(shift.icon);
            expect(results[0].backgroundColor).toBe(shift.backgroundColor);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
