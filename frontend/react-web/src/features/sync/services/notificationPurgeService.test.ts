import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { purgePastNotifications, getTodayDateString } from './notificationPurgeService';

/**
 * Property 3: Client purge identifies correct records
 * Validates: Requirements 2.1, 2.3, 2.7
 */

// Mock the db module
vi.mock('@/data/db', () => ({
  db: {
    notifications: {
      toArray: vi.fn(),
      bulkDelete: vi.fn(),
    },
    calendarEvents: {
      toArray: vi.fn(),
    },
  },
}));

import { db } from '@/data/db';

const mockNotificationsToArray = vi.mocked(db.notifications.toArray);
const mockCalendarEventsToArray = vi.mocked(db.calendarEvents.toArray);
const mockBulkDelete = vi.mocked(db.notifications.bulkDelete);

describe('notificationPurgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkDelete.mockResolvedValue(undefined);
    // Fix today's date to 2025-06-15 for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('purgePastNotifications', () => {
    it('should return purgedCount: 0 when no notifications exist', async () => {
      mockNotificationsToArray.mockResolvedValue([]);

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 0 });
      expect(mockCalendarEventsToArray).not.toHaveBeenCalled();
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('should purge notifications whose calendarEvent startDay is before today', async () => {
      mockNotificationsToArray.mockResolvedValue([
        { id: 'notif-1', calendarEventId: 'event-past' } as never,
        { id: 'notif-2', calendarEventId: 'event-past-2' } as never,
      ]);
      mockCalendarEventsToArray.mockResolvedValue([
        { id: 'event-past', startDay: '2025-06-10' } as never,
        { id: 'event-past-2', startDay: '2025-06-01' } as never,
      ]);

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 2 });
      expect(mockBulkDelete).toHaveBeenCalledWith(['notif-1', 'notif-2']);
    });

    it('should NOT purge notifications whose calendarEvent startDay equals today', async () => {
      mockNotificationsToArray.mockResolvedValue([
        { id: 'notif-today', calendarEventId: 'event-today' } as never,
      ]);
      mockCalendarEventsToArray.mockResolvedValue([
        { id: 'event-today', startDay: '2025-06-15' } as never,
      ]);

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 0 });
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('should NOT purge notifications whose calendarEvent startDay is after today', async () => {
      mockNotificationsToArray.mockResolvedValue([
        { id: 'notif-future', calendarEventId: 'event-future' } as never,
      ]);
      mockCalendarEventsToArray.mockResolvedValue([
        { id: 'event-future', startDay: '2025-06-20' } as never,
      ]);

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 0 });
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('should purge orphaned notifications (calendarEventId does not match any event)', async () => {
      mockNotificationsToArray.mockResolvedValue([
        { id: 'notif-orphan', calendarEventId: 'non-existent-event' } as never,
      ]);
      mockCalendarEventsToArray.mockResolvedValue([
        { id: 'some-other-event', startDay: '2025-06-20' } as never,
      ]);

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 1 });
      expect(mockBulkDelete).toHaveBeenCalledWith(['notif-orphan']);
    });

    it('should handle mixed records (some past, some current, some orphaned)', async () => {
      mockNotificationsToArray.mockResolvedValue([
        { id: 'notif-past', calendarEventId: 'event-past' } as never,
        { id: 'notif-today', calendarEventId: 'event-today' } as never,
        { id: 'notif-future', calendarEventId: 'event-future' } as never,
        { id: 'notif-orphan', calendarEventId: 'event-missing' } as never,
      ]);
      mockCalendarEventsToArray.mockResolvedValue([
        { id: 'event-past', startDay: '2025-06-10' } as never,
        { id: 'event-today', startDay: '2025-06-15' } as never,
        { id: 'event-future', startDay: '2025-06-20' } as never,
      ]);

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 2 });
      expect(mockBulkDelete).toHaveBeenCalledWith(['notif-past', 'notif-orphan']);
    });

    it('should return error in result (not throw) when IndexedDB operation fails', async () => {
      mockNotificationsToArray.mockRejectedValue(new Error('IndexedDB read failed'));

      const result = await purgePastNotifications();

      expect(result).toEqual({ purgedCount: 0, error: 'IndexedDB read failed' });
    });

    it('should call bulkDelete with correct IDs', async () => {
      mockNotificationsToArray.mockResolvedValue([
        { id: 'a1', calendarEventId: 'ev-old' } as never,
        { id: 'b2', calendarEventId: 'ev-current' } as never,
        { id: 'c3', calendarEventId: 'ev-orphan-ref' } as never,
      ]);
      mockCalendarEventsToArray.mockResolvedValue([
        { id: 'ev-old', startDay: '2025-05-01' } as never,
        { id: 'ev-current', startDay: '2025-06-15' } as never,
      ]);

      await purgePastNotifications();

      expect(mockBulkDelete).toHaveBeenCalledTimes(1);
      expect(mockBulkDelete).toHaveBeenCalledWith(['a1', 'c3']);
    });
  });

  describe('getTodayDateString', () => {
    it('should return a string in YYYY-MM-DD format', () => {
      const result = getTodayDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return the current date based on system time', () => {
      const result = getTodayDateString();
      expect(result).toBe('2025-06-15');
    });
  });
});
