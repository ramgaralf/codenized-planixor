import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '@/data/db';
import type { CalendarEvent } from '@features/calendar-events/models';

import { checkShiftPropagationNeeded, propagateShiftChanges } from './shiftPropagation';

const SHIFT_ID = 'shift-001';
const OTHER_SHIFT_ID = 'shift-002';

const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

/** Helper to build a date string in the current year */
const dayInCurrentYear = (month: number, day: number): string =>
  `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Helper to build a date string in the previous year */
const dayInPreviousYear = (month: number, day: number): string =>
  `${previousYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: crypto.randomUUID(),
  eventType: 'shift',
  eventTypeId: SHIFT_ID,
  startDay: dayInCurrentYear(6, 15),
  endDay: dayInCurrentYear(6, 15),
  startTime: 480,
  endTime: 1020,
  totalHours: 540,
  notes: null,
  modifiedAt: new Date('2025-06-01T00:00:00Z'),
  syncedAt: new Date('2025-06-01T00:00:00Z'),
  isDeleted: false,
  alertOffsets: [],
  ...overrides,
});

describe('shiftPropagation', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('checkShiftPropagationNeeded', () => {
    it('should return 0 when no calendar events exist', async () => {
      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(0);
    });

    it('should return the count of matching non-deleted events in the current year', async () => {
      await db.calendarEvents.bulkAdd([
        createEvent(),
        createEvent({ startDay: dayInCurrentYear(3, 10), endDay: dayInCurrentYear(3, 10) }),
      ]);

      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(2);
    });

    it('should exclude deleted events', async () => {
      await db.calendarEvents.bulkAdd([
        createEvent(),
        createEvent({ isDeleted: true }),
      ]);

      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(1);
    });

    it('should exclude events from other shifts', async () => {
      await db.calendarEvents.bulkAdd([
        createEvent(),
        createEvent({ eventTypeId: OTHER_SHIFT_ID }),
      ]);

      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(1);
    });

    it('should exclude events from previous years', async () => {
      await db.calendarEvents.bulkAdd([
        createEvent(),
        createEvent({ startDay: dayInPreviousYear(6, 15), endDay: dayInPreviousYear(6, 15) }),
      ]);

      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(1);
    });

    it('should exclude reminder-type events', async () => {
      await db.calendarEvents.bulkAdd([
        createEvent(),
        createEvent({ eventType: 'reminder', eventTypeId: SHIFT_ID }),
      ]);

      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(1);
    });

    it('should include events at year boundaries', async () => {
      await db.calendarEvents.bulkAdd([
        createEvent({ startDay: dayInCurrentYear(1, 1), endDay: dayInCurrentYear(1, 1) }),
        createEvent({ startDay: dayInCurrentYear(12, 31), endDay: dayInCurrentYear(12, 31) }),
      ]);

      const count = await checkShiftPropagationNeeded(SHIFT_ID);

      expect(count).toBe(2);
    });
  });

  describe('propagateShiftChanges', () => {
    it('should update startTime, endTime, and totalHours on matching events', async () => {
      const eventId = crypto.randomUUID();
      await db.calendarEvents.add(createEvent({ id: eventId }));

      await propagateShiftChanges(SHIFT_ID, 600, 1200, 600);

      const updated = await db.calendarEvents.get(eventId);
      expect(updated?.startTime).toBe(600);
      expect(updated?.endTime).toBe(1200);
      expect(updated?.totalHours).toBe(600);
    });

    it('should compute endDay correctly when shift crosses midnight', async () => {
      const eventId = crypto.randomUUID();
      const startDay = dayInCurrentYear(6, 15);
      await db.calendarEvents.add(createEvent({ id: eventId, startDay, endDay: startDay }));

      await propagateShiftChanges(SHIFT_ID, 1380, 60, 120);

      const updated = await db.calendarEvents.get(eventId);
      expect(updated?.endDay).toBe(dayInCurrentYear(6, 16));
    });

    it('should keep endDay same as startDay when shift does not cross midnight', async () => {
      const eventId = crypto.randomUUID();
      const startDay = dayInCurrentYear(6, 15);
      // Intentionally set endDay different to verify it gets corrected
      await db.calendarEvents.add(createEvent({ id: eventId, startDay, endDay: dayInCurrentYear(6, 16) }));

      await propagateShiftChanges(SHIFT_ID, 480, 1020, 540);

      const updated = await db.calendarEvents.get(eventId);
      expect(updated?.endDay).toBe(startDay);
    });

    it('should set modifiedAt to current time and syncedAt to null', async () => {
      const eventId = crypto.randomUUID();
      await db.calendarEvents.add(createEvent({ id: eventId }));

      const before = new Date();
      await propagateShiftChanges(SHIFT_ID, 600, 1200, 600);
      const after = new Date();

      const updated = await db.calendarEvents.get(eventId);
      expect(updated?.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated?.modifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(updated?.syncedAt).toBeNull();
    });

    it('should not modify deleted events', async () => {
      const eventId = crypto.randomUUID();
      await db.calendarEvents.add(createEvent({ id: eventId, isDeleted: true, startTime: 480 }));

      await propagateShiftChanges(SHIFT_ID, 600, 1200, 600);

      const unchanged = await db.calendarEvents.get(eventId);
      expect(unchanged?.startTime).toBe(480);
    });

    it('should not modify events from other shifts', async () => {
      const eventId = crypto.randomUUID();
      await db.calendarEvents.add(createEvent({ id: eventId, eventTypeId: OTHER_SHIFT_ID, startTime: 480 }));

      await propagateShiftChanges(SHIFT_ID, 600, 1200, 600);

      const unchanged = await db.calendarEvents.get(eventId);
      expect(unchanged?.startTime).toBe(480);
    });

    it('should not modify events from previous years', async () => {
      const eventId = crypto.randomUUID();
      const previousDay = dayInPreviousYear(6, 15);
      await db.calendarEvents.add(createEvent({ id: eventId, startDay: previousDay, endDay: previousDay, startTime: 480 }));

      await propagateShiftChanges(SHIFT_ID, 600, 1200, 600);

      const unchanged = await db.calendarEvents.get(eventId);
      expect(unchanged?.startTime).toBe(480);
    });

    it('should batch-update multiple matching events', async () => {
      const eventIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
      await db.calendarEvents.bulkAdd([
        createEvent({ id: eventIds[0], startDay: dayInCurrentYear(1, 15), endDay: dayInCurrentYear(1, 15) }),
        createEvent({ id: eventIds[1], startDay: dayInCurrentYear(6, 15), endDay: dayInCurrentYear(6, 15) }),
        createEvent({ id: eventIds[2], startDay: dayInCurrentYear(12, 1), endDay: dayInCurrentYear(12, 1) }),
      ]);

      await propagateShiftChanges(SHIFT_ID, 720, 1080, 360);

      for (const id of eventIds) {
        const updated = await db.calendarEvents.get(id);
        expect(updated?.startTime).toBe(720);
        expect(updated?.endTime).toBe(1080);
        expect(updated?.totalHours).toBe(360);
      }
    });
  });
});
