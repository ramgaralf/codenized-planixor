import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { db } from '@/data/db';

import type { NotificationRecord } from '../types';

import {
  computeEventStartDateTime,
  computeTriggerTime,
  runCheckCycle,
  reconcileNotifications,
  deleteNotificationsForEvent,
  getUnreadCount,
  resolveEventName,
} from './notificationService';

import type { CalendarEvent } from '@features/calendar-events/models';

// Mock the channel settings and system notification delivery
vi.mock('./notificationSettings', () => ({
  getChannel: vi.fn().mockResolvedValue('app'),
}));

vi.mock('./systemNotificationDelivery', () => ({
  deliverSystemNotification: vi.fn().mockReturnValue(true),
}));

import { getChannel } from './notificationSettings';
import { deliverSystemNotification } from './systemNotificationDelivery';

/**
 * Creates a CalendarEvent with future start for testing.
 */
const createFutureEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'event-1',
  eventType: 'reminder',
  eventTypeId: 'reminder-1',
  startDay: '2030-06-15',
  endDay: '2030-06-15',
  startTime: 600, // 10:00 local
  endTime: 660, // 11:00 local
  totalHours: 60,
  notes: null,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  alertOffsets: [0, 10, 60],
  ...overrides,
});

/**
 * Creates a NotificationRecord for testing.
 */
const createNotificationRecord = (overrides: Partial<NotificationRecord> = {}): NotificationRecord => ({
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

describe('notificationService', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('computeEventStartDateTime', () => {
    it('should compute correct local milliseconds for startDay + startTime', () => {
      // startTime=600 means 10:00 local time
      const result = computeEventStartDateTime('2030-06-15', 600);
      const expected = new Date(2030, 5, 15, 10, 0, 0, 0).getTime();
      expect(result).toBe(expected);
    });

    it('should handle midnight (startTime = 0)', () => {
      const result = computeEventStartDateTime('2030-01-01', 0);
      const expected = new Date(2030, 0, 1, 0, 0, 0, 0).getTime();
      expect(result).toBe(expected);
    });

    it('should handle end of day (startTime = 1439)', () => {
      const result = computeEventStartDateTime('2030-01-01', 1439);
      const expected = new Date(2030, 0, 1, 23, 59, 0, 0).getTime();
      expect(result).toBe(expected);
    });
  });

  describe('computeTriggerTime', () => {
    it('should subtract alertOffset minutes from event start', () => {
      const eventStart = new Date(2030, 5, 15, 10, 0, 0, 0).getTime();
      const result = computeTriggerTime(eventStart, 10);
      const expected = new Date(2030, 5, 15, 9, 50, 0, 0).getTime();
      expect(result).toBe(expected);
    });

    it('should return event start when alertOffset is 0', () => {
      const eventStart = new Date(2030, 5, 15, 10, 0, 0, 0).getTime();
      const result = computeTriggerTime(eventStart, 0);
      expect(result).toBe(eventStart);
    });

    it('should handle 1 day offset (1440 minutes)', () => {
      const eventStart = new Date(2030, 5, 15, 10, 0, 0, 0).getTime();
      const result = computeTriggerTime(eventStart, 1440);
      const expected = new Date(2030, 5, 14, 10, 0, 0, 0).getTime();
      expect(result).toBe(expected);
    });
  });

  describe('runCheckCycle', () => {
    beforeEach(() => {
      vi.mocked(getChannel).mockResolvedValue('app');
      vi.mocked(deliverSystemNotification).mockReturnValue(true);
    });

    it('should mark due notifications as delivered when channel is "app"', async () => {
      const pastTrigger = new Date(Date.now() - 60_000); // 1 min ago
      const record = createNotificationRecord({
        id: 'notif-1',
        triggerTime: pastTrigger,
        isDelivered: false,
        isDeleted: false,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const updated = await db.notifications.get('notif-1');
      expect(updated!.isDelivered).toBe(true);
      expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
    });

    it('should not deliver future notifications', async () => {
      const futureTrigger = new Date(Date.now() + 3_600_000); // 1 hour from now
      const record = createNotificationRecord({
        id: 'notif-future',
        triggerTime: futureTrigger,
        isDelivered: false,
        isDeleted: false,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const unchanged = await db.notifications.get('notif-future');
      expect(unchanged!.isDelivered).toBe(false);
    });

    it('should not deliver already delivered notifications', async () => {
      const pastTrigger = new Date(Date.now() - 60_000);
      const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
      const record = createNotificationRecord({
        id: 'notif-delivered',
        triggerTime: pastTrigger,
        isDelivered: true,
        modifiedAt: originalModifiedAt,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const unchanged = await db.notifications.get('notif-delivered');
      expect(unchanged!.modifiedAt.getTime()).toBe(originalModifiedAt.getTime());
    });

    it('should not deliver deleted notifications', async () => {
      const pastTrigger = new Date(Date.now() - 60_000);
      const record = createNotificationRecord({
        id: 'notif-deleted',
        triggerTime: pastTrigger,
        isDelivered: false,
        isDeleted: true,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const unchanged = await db.notifications.get('notif-deleted');
      expect(unchanged!.isDelivered).toBe(false);
    });

    it('should deliver multiple due notifications in triggerTime ASC order', async () => {
      const deliveryOrder: string[] = [];
      const originalUpdate = db.notifications.update.bind(db.notifications);
      vi.spyOn(db.notifications, 'update').mockImplementation(async (id, changes) => {
        deliveryOrder.push(id as string);
        return originalUpdate(id, changes);
      });

      await db.notifications.bulkAdd([
        createNotificationRecord({
          id: 'notif-newer',
          triggerTime: new Date(Date.now() - 30_000),
        }),
        createNotificationRecord({
          id: 'notif-older',
          triggerTime: new Date(Date.now() - 120_000),
        }),
      ]);

      await runCheckCycle();

      expect(deliveryOrder).toEqual(['notif-older', 'notif-newer']);

      vi.restoreAllMocks();
    });

    it('should call deliverSystemNotification when channel is "system"', async () => {
      vi.mocked(getChannel).mockResolvedValue('system');
      vi.mocked(deliverSystemNotification).mockReturnValue(true);

      const pastTrigger = new Date(Date.now() - 60_000);
      const record = createNotificationRecord({
        id: 'notif-system',
        triggerTime: pastTrigger,
        calendarEventId: 'event-sys',
      });

      // Add related entities for event name resolution
      await db.calendarEvents.add({
        id: 'event-sys',
        eventType: 'reminder',
        eventTypeId: 'rem-1',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 600,
        endTime: 660,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [10],
      });
      await db.reminders.add({
        id: 'rem-1',
        name: 'Test Reminder',
        icon: '🔔',
        backgroundColor: '#2563EB',
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      expect(deliverSystemNotification).toHaveBeenCalledWith('🔔', 'Test Reminder', '2030-06-15', 600, 10);
      const updated = await db.notifications.get('notif-system');
      expect(updated!.isDelivered).toBe(true);
    });

    it('should NOT mark as delivered when system delivery fails and channel is "system"', async () => {
      vi.mocked(getChannel).mockResolvedValue('system');
      vi.mocked(deliverSystemNotification).mockReturnValue(false);

      const pastTrigger = new Date(Date.now() - 60_000);
      const record = createNotificationRecord({
        id: 'notif-sys-fail',
        triggerTime: pastTrigger,
        calendarEventId: 'event-sys-fail',
      });

      await db.calendarEvents.add({
        id: 'event-sys-fail',
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 600,
        endTime: 660,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [10],
      });
      await db.shifts.add({
        id: 'shift-1',
        name: 'Morning',
        icon: '🌅',
        backgroundColor: '#10B981',
        startTime: 360,
        endTime: 840,
        hoursWorked: 480,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const unchanged = await db.notifications.get('notif-sys-fail');
      expect(unchanged!.isDelivered).toBe(false);
    });

    it('should mark as delivered when system succeeds with channel "both"', async () => {
      vi.mocked(getChannel).mockResolvedValue('both');
      vi.mocked(deliverSystemNotification).mockReturnValue(true);

      const pastTrigger = new Date(Date.now() - 60_000);
      const record = createNotificationRecord({
        id: 'notif-both-ok',
        triggerTime: pastTrigger,
        calendarEventId: 'event-both',
      });

      await db.calendarEvents.add({
        id: 'event-both',
        eventType: 'reminder',
        eventTypeId: 'rem-both',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 600,
        endTime: 660,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [10],
      });
      await db.reminders.add({
        id: 'rem-both',
        name: 'Both Channel Test',
        icon: '📋',
        backgroundColor: '#7C3AED',
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const updated = await db.notifications.get('notif-both-ok');
      expect(updated!.isDelivered).toBe(true);
    });

    it('should mark as delivered even when system fails with channel "both" (app notification always visible)', async () => {
      vi.mocked(getChannel).mockResolvedValue('both');
      vi.mocked(deliverSystemNotification).mockReturnValue(false);

      const pastTrigger = new Date(Date.now() - 60_000);
      const record = createNotificationRecord({
        id: 'notif-both-fail',
        triggerTime: pastTrigger,
        calendarEventId: 'event-both-fail',
      });

      await db.calendarEvents.add({
        id: 'event-both-fail',
        eventType: 'reminder',
        eventTypeId: 'rem-both-fail',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 600,
        endTime: 660,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [10],
      });
      await db.reminders.add({
        id: 'rem-both-fail',
        name: 'Both Fail Test',
        icon: '⚡',
        backgroundColor: '#EF4444',
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      await db.notifications.add(record);
      await runCheckCycle();

      const updated = await db.notifications.get('notif-both-fail');
      expect(updated!.isDelivered).toBe(true);
    });
  });

  describe('resolveEventName', () => {
    it('should return reminder name for reminder events', async () => {
      await db.calendarEvents.add({
        id: 'ev-rem',
        eventType: 'reminder',
        eventTypeId: 'rem-x',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 600,
        endTime: 660,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [],
      });
      await db.reminders.add({
        id: 'rem-x',
        name: 'Take Medicine',
        icon: '💊',
        backgroundColor: '#10B981',
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const name = await resolveEventName('ev-rem');
      expect(name).toBe('Take Medicine');
    });

    it('should return shift name for shift events', async () => {
      await db.calendarEvents.add({
        id: 'ev-shift',
        eventType: 'shift',
        eventTypeId: 'shift-x',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 360,
        endTime: 840,
        totalHours: 480,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [],
      });
      await db.shifts.add({
        id: 'shift-x',
        name: 'Night Shift',
        icon: '🌙',
        backgroundColor: '#2563EB',
        startTime: 1320,
        endTime: 360,
        hoursWorked: 480,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const name = await resolveEventName('ev-shift');
      expect(name).toBe('Night Shift');
    });

    it('should return fallback when event not found', async () => {
      const name = await resolveEventName('nonexistent');
      expect(name).toBe('Planixor');
    });

    it('should return fallback when referenced entity not found', async () => {
      await db.calendarEvents.add({
        id: 'ev-orphan',
        eventType: 'reminder',
        eventTypeId: 'missing-reminder',
        startDay: '2030-06-15',
        endDay: '2030-06-15',
        startTime: 600,
        endTime: 660,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
        alertOffsets: [],
      });

      const name = await resolveEventName('ev-orphan');
      expect(name).toBe('Planixor');
    });
  });

  describe('reconcileNotifications', () => {
    it('should soft-delete existing non-delivered records for the event', async () => {
      const existingRecord = createNotificationRecord({
        id: 'existing-1',
        calendarEventId: 'event-1',
        alertOffset: 10,
        isDelivered: false,
        isDeleted: false,
      });
      await db.notifications.add(existingRecord);

      const event = createFutureEvent({ alertOffsets: [60] });
      await reconcileNotifications(event);

      const deleted = await db.notifications.get('existing-1');
      expect(deleted!.isDeleted).toBe(true);
    });

    it('should NOT soft-delete already delivered records', async () => {
      const deliveredRecord = createNotificationRecord({
        id: 'delivered-1',
        calendarEventId: 'event-1',
        alertOffset: 10,
        isDelivered: true,
        isDeleted: false,
      });
      await db.notifications.add(deliveredRecord);

      const event = createFutureEvent({ alertOffsets: [60] });
      await reconcileNotifications(event);

      const unchanged = await db.notifications.get('delivered-1');
      expect(unchanged!.isDeleted).toBe(false);
    });

    it('should create new records for each alertOffset with future trigger time', async () => {
      const event = createFutureEvent({ alertOffsets: [0, 10, 60] });
      await reconcileNotifications(event);

      const records = await db.notifications
        .where('calendarEventId')
        .equals('event-1')
        .filter((r) => !r.isDeleted)
        .toArray();

      expect(records).toHaveLength(3);
      expect(records.map((r) => r.alertOffset).sort()).toEqual([0, 10, 60]);
    });

    it('should NOT create records for past trigger times', async () => {
      // Event start is in the past
      const event = createFutureEvent({
        startDay: '2020-01-01',
        startTime: 600, // 10:00 UTC on 2020-01-01 — well in the past
        alertOffsets: [0, 10],
      });
      await reconcileNotifications(event);

      const records = await db.notifications
        .where('calendarEventId')
        .equals('event-1')
        .filter((r) => !r.isDeleted)
        .toArray();

      expect(records).toHaveLength(0);
    });

    it('should compute correct triggerTime for each record', async () => {
      const event = createFutureEvent({
        startDay: '2030-06-15',
        startTime: 600, // 10:00 local
        alertOffsets: [10, 60],
      });
      await reconcileNotifications(event);

      const records = await db.notifications
        .where('calendarEventId')
        .equals('event-1')
        .filter((r) => !r.isDeleted)
        .toArray();

      const byOffset = new Map(records.map((r) => [r.alertOffset, r]));
      // 10 min before 10:00 local = 09:50 local
      expect(byOffset.get(10)!.triggerTime.getTime()).toBe(
        new Date(2030, 5, 15, 9, 50, 0, 0).getTime(),
      );
      // 60 min before 10:00 local = 09:00 local
      expect(byOffset.get(60)!.triggerTime.getTime()).toBe(
        new Date(2030, 5, 15, 9, 0, 0, 0).getTime(),
      );
    });

    it('should set correct fields on created records', async () => {
      const event = createFutureEvent({ alertOffsets: [10] });
      await reconcileNotifications(event);

      const records = await db.notifications
        .where('calendarEventId')
        .equals('event-1')
        .filter((r) => !r.isDeleted)
        .toArray();

      expect(records).toHaveLength(1);
      const record = records[0]!;
      expect(record.calendarEventId).toBe('event-1');
      expect(record.alertOffset).toBe(10);
      expect(record.isDelivered).toBe(false);
      expect(record.isRead).toBe(false);
      expect(record.syncedAt).toBeNull();
      expect(record.isDeleted).toBe(false);
      expect(record.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should handle empty alertOffsets (removes all non-delivered)', async () => {
      await db.notifications.add(
        createNotificationRecord({
          id: 'to-delete',
          calendarEventId: 'event-1',
          isDelivered: false,
        }),
      );

      const event = createFutureEvent({ alertOffsets: [] });
      await reconcileNotifications(event);

      const deleted = await db.notifications.get('to-delete');
      expect(deleted!.isDeleted).toBe(true);

      const active = await db.notifications
        .where('calendarEventId')
        .equals('event-1')
        .filter((r) => !r.isDeleted)
        .toArray();
      expect(active).toHaveLength(0);
    });
  });

  describe('deleteNotificationsForEvent', () => {
    it('should soft-delete all non-deleted records for the event', async () => {
      await db.notifications.bulkAdd([
        createNotificationRecord({
          id: 'del-1',
          calendarEventId: 'event-1',
          isDelivered: false,
        }),
        createNotificationRecord({
          id: 'del-2',
          calendarEventId: 'event-1',
          isDelivered: true, // delivered records are also soft-deleted
        }),
      ]);

      await deleteNotificationsForEvent('event-1');

      const records = await db.notifications.toArray();
      expect(records.every((r) => r.isDeleted)).toBe(true);
    });

    it('should not affect records from other events', async () => {
      await db.notifications.bulkAdd([
        createNotificationRecord({
          id: 'other-event',
          calendarEventId: 'event-2',
        }),
        createNotificationRecord({
          id: 'target-event',
          calendarEventId: 'event-1',
        }),
      ]);

      await deleteNotificationsForEvent('event-1');

      const otherRecord = await db.notifications.get('other-event');
      expect(otherRecord!.isDeleted).toBe(false);
    });

    it('should not re-delete already deleted records', async () => {
      const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
      await db.notifications.add(
        createNotificationRecord({
          id: 'already-deleted',
          calendarEventId: 'event-1',
          isDeleted: true,
          modifiedAt: originalModifiedAt,
        }),
      );

      await deleteNotificationsForEvent('event-1');

      const record = await db.notifications.get('already-deleted');
      expect(record!.modifiedAt.getTime()).toBe(originalModifiedAt.getTime());
    });

    it('should update modifiedAt on soft-deleted records', async () => {
      const oldModifiedAt = new Date('2020-01-01T00:00:00Z');
      await db.notifications.add(
        createNotificationRecord({
          id: 'update-modified',
          calendarEventId: 'event-1',
          modifiedAt: oldModifiedAt,
        }),
      );

      await deleteNotificationsForEvent('event-1');

      const record = await db.notifications.get('update-modified');
      expect(record!.modifiedAt.getTime()).toBeGreaterThan(oldModifiedAt.getTime());
    });
  });

  describe('getUnreadCount', () => {
    it('should count records where isRead=false, isDelivered=true, isDeleted=false', async () => {
      await db.notifications.bulkAdd([
        createNotificationRecord({
          id: 'unread-delivered',
          isRead: false,
          isDelivered: true,
          isDeleted: false,
        }),
        createNotificationRecord({
          id: 'unread-delivered-2',
          isRead: false,
          isDelivered: true,
          isDeleted: false,
        }),
      ]);

      const count = await getUnreadCount();
      expect(count).toBe(2);
    });

    it('should not count read notifications', async () => {
      await db.notifications.add(
        createNotificationRecord({
          id: 'read',
          isRead: true,
          isDelivered: true,
          isDeleted: false,
        }),
      );

      const count = await getUnreadCount();
      expect(count).toBe(0);
    });

    it('should not count undelivered notifications', async () => {
      await db.notifications.add(
        createNotificationRecord({
          id: 'undelivered',
          isRead: false,
          isDelivered: false,
          isDeleted: false,
        }),
      );

      const count = await getUnreadCount();
      expect(count).toBe(0);
    });

    it('should not count deleted notifications', async () => {
      await db.notifications.add(
        createNotificationRecord({
          id: 'deleted',
          isRead: false,
          isDelivered: true,
          isDeleted: true,
        }),
      );

      const count = await getUnreadCount();
      expect(count).toBe(0);
    });

    it('should return 0 when no matching records exist', async () => {
      const count = await getUnreadCount();
      expect(count).toBe(0);
    });
  });
});
