import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db, PlanixorDatabase } from './db';
import type { CalendarEvent } from './models';
import { EventType } from './models';

describe('PlanixorDatabase', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should be an instance of PlanixorDatabase', () => {
    expect(db).toBeInstanceOf(PlanixorDatabase);
  });

  it('should have a calendarEvents table', () => {
    expect(db.calendarEvents).toBeDefined();
  });

  it('should store and retrieve a CalendarEvent by id', async () => {
    const event: CalendarEvent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Morning Shift',
      description: null,
      startAt: new Date('2025-01-15T06:00:00Z'),
      endAt: new Date('2025-01-15T14:00:00Z'),
      isAllDay: false,
      eventType: EventType.ShiftMorning,
      color: null,
      modifiedAt: new Date('2025-01-15T05:00:00Z'),
      syncedAt: null,
      isDeleted: false,
    };

    await db.calendarEvents.add(event);
    const retrieved = await db.calendarEvents.get(event.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(event.id);
    expect(retrieved!.title).toBe('Morning Shift');
    expect(retrieved!.eventType).toBe(EventType.ShiftMorning);
    expect(retrieved!.isDeleted).toBe(false);
    expect(retrieved!.syncedAt).toBeNull();
  });

  it('should query events by eventType index', async () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        title: 'Morning',
        description: null,
        startAt: new Date('2025-01-15T06:00:00Z'),
        endAt: new Date('2025-01-15T14:00:00Z'),
        isAllDay: false,
        eventType: EventType.ShiftMorning,
        color: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      },
      {
        id: '2',
        title: 'Meeting',
        description: 'Team sync',
        startAt: new Date('2025-01-15T10:00:00Z'),
        endAt: new Date('2025-01-15T11:00:00Z'),
        isAllDay: false,
        eventType: EventType.Meeting,
        color: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      },
      {
        id: '3',
        title: 'Afternoon',
        description: null,
        startAt: new Date('2025-01-15T14:00:00Z'),
        endAt: new Date('2025-01-15T22:00:00Z'),
        isAllDay: false,
        eventType: EventType.ShiftAfternoon,
        color: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      },
    ];

    await db.calendarEvents.bulkAdd(events);

    const morningShifts = await db.calendarEvents
      .where('eventType')
      .equals(EventType.ShiftMorning)
      .toArray();

    expect(morningShifts).toHaveLength(1);
    expect(morningShifts[0]!.title).toBe('Morning');
  });

  it('should filter events by isDeleted field', async () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        title: 'Active event',
        description: null,
        startAt: new Date('2025-01-15T06:00:00Z'),
        endAt: new Date('2025-01-15T14:00:00Z'),
        isAllDay: false,
        eventType: EventType.Personal,
        color: '#FF5733',
        modifiedAt: new Date(),
        syncedAt: new Date(),
        isDeleted: false,
      },
      {
        id: '2',
        title: 'Deleted event',
        description: null,
        startAt: new Date('2025-01-15T10:00:00Z'),
        endAt: new Date('2025-01-15T11:00:00Z'),
        isAllDay: false,
        eventType: EventType.Reminder,
        color: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: true,
      },
    ];

    await db.calendarEvents.bulkAdd(events);

    const activeEvents = await db.calendarEvents
      .filter((event) => !event.isDeleted)
      .toArray();

    expect(activeEvents).toHaveLength(1);
    expect(activeEvents[0]!.title).toBe('Active event');
  });
});
