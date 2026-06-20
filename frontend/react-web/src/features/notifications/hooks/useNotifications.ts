import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/data/db';

import type { CalendarEvent } from '@features/calendar-events/models';
import type { Reminder } from '@features/reminders/models';
import type { Shift } from '@features/shifts/models';

import type { NotificationChannel, NotificationRecord } from '../types';
import { getChannel } from '../services/notificationSettings';
import { subscribeToBadgeCount, refreshBadgeCount } from '../services/notificationWorkerManager';

/**
 * Display-enriched notification item resolved from NotificationRecord
 * joined with CalendarEvent and Shift/Reminder.
 */
export interface NotificationDisplayItem {
  /** NotificationRecord ID */
  id: string;
  /** Calendar event ID (for navigation) */
  calendarEventId: string;
  /** Resolved event name (from shift/reminder) */
  eventName: string;
  /** Resolved event icon (emoji from shift/reminder) */
  eventIcon: string;
  /** Alert offset in minutes */
  alertOffset: number;
  /** When the notification was triggered */
  triggerTime: Date;
  /** Whether the referenced calendar event is soft-deleted */
  isEventDeleted: boolean;
}

export interface UseNotificationsReturn {
  /** Enriched notification items ready for display */
  notifications: NotificationDisplayItem[];
  /** Unread badge count (reactive from worker) */
  unreadCount: number;
  /** Current notification channel setting */
  channel: NotificationChannel;
  /** Whether notifications are loading */
  isLoading: boolean;
  /** Mark a single notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all displayed notifications as read */
  markAllAsRead: () => Promise<void>;
}

const MAX_NAME_LENGTH = 60;

/**
 * Truncates a string to the specified max length with ellipsis.
 */
const truncateName = (name: string, maxLength: number = MAX_NAME_LENGTH): string => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '…';
};

/**
 * Resolves display fields for a notification by joining with CalendarEvent → Shift/Reminder.
 */
const resolveDisplayItem = async (
  record: NotificationRecord,
  calendarEvent: CalendarEvent | undefined,
  shifts: Map<string, Shift>,
  reminders: Map<string, Reminder>,
): Promise<NotificationDisplayItem> => {
  let eventName = 'Planixor';
  let eventIcon = '📅';
  let isEventDeleted = false;

  if (calendarEvent) {
    isEventDeleted = calendarEvent.isDeleted;

    if (calendarEvent.eventType === 'shift') {
      const shift = shifts.get(calendarEvent.eventTypeId);
      if (shift) {
        eventName = shift.name;
        eventIcon = shift.icon;
      }
    } else {
      const reminder = reminders.get(calendarEvent.eventTypeId);
      if (reminder) {
        eventName = reminder.name;
        eventIcon = reminder.icon;
      }
    }
  }

  return {
    id: record.id,
    calendarEventId: record.calendarEventId,
    eventName: truncateName(eventName),
    eventIcon,
    alertOffset: record.alertOffset,
    triggerTime: record.triggerTime,
    isEventDeleted,
  };
};

/**
 * Converts bulk-get results into a Map, filtering undefined entries.
 */
const bulkGetToMap = <T>(ids: string[], results: (T | undefined)[]): Map<string, T> => {
  const map = new Map<string, T>();
  for (let i = 0; i < ids.length; i++) {
    const item = results[i];
    const id = ids[i];
    if (item && id) map.set(id, item);
  }
  return map;
};

/**
 * Batch-resolves display items for a list of notification records.
 * Fetches CalendarEvents, Shifts, and Reminders in bulk to minimize DB calls.
 */
const resolveDisplayItems = async (
  records: NotificationRecord[],
): Promise<NotificationDisplayItem[]> => {
  const eventIds = [...new Set(records.map((r) => r.calendarEventId))];
  const eventMap = bulkGetToMap(eventIds, await db.calendarEvents.bulkGet(eventIds));

  // Gather unique shift/reminder IDs from resolved events
  const shiftIds: string[] = [];
  const reminderIds: string[] = [];
  for (const ev of eventMap.values()) {
    if (ev.eventType === 'shift') {
      shiftIds.push(ev.eventTypeId);
    } else {
      reminderIds.push(ev.eventTypeId);
    }
  }

  const shiftsMap = bulkGetToMap(shiftIds, await db.shifts.bulkGet(shiftIds));
  const remindersMap = bulkGetToMap(reminderIds, await db.reminders.bulkGet(reminderIds));

  return Promise.all(
    records.map((record) =>
      resolveDisplayItem(
        record,
        eventMap.get(record.calendarEventId),
        shiftsMap,
        remindersMap,
      ),
    ),
  );
};

/**
 * Hook providing notification list, unread count, and actions for the NotificationView.
 *
 * - Queries Dexie for unread, delivered, non-deleted notifications
 * - Derives display fields by joining with CalendarEvent → Shift/Reminder
 * - Uses subscribeToBadgeCount for reactive badge updates from the worker
 * - Provides markAsRead and markAllAsRead actions
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.4, 4.5, 8.4**
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [channel, setChannelState] = useState<NotificationChannel>('both');

  // Subscribe to badge count from worker manager (reactive)
  useEffect(() => {
    const unsubscribe = subscribeToBadgeCount((count) => {
      setUnreadCount(count);
    });
    return unsubscribe;
  }, []);

  // Load channel setting
  useEffect(() => {
    const loadChannel = async () => {
      const ch = await getChannel();
      setChannelState(ch);
    };
    loadChannel();
  }, []);

  // Query unread delivered notifications from Dexie (live)
  const rawNotifications = useLiveQuery(
    () =>
      db.notifications
        .filter(
          (record) =>
            record.isRead === false &&
            record.isDelivered === true &&
            record.isDeleted === false,
        )
        .sortBy('triggerTime')
        .then((records) => {
          // Sort descending (most recent first) and limit to 100
          return records.reverse().slice(0, 100);
        }),
    [],
    [],
  );

  // Resolve display items by joining with CalendarEvent + Shift/Reminder
  const [displayItems, setDisplayItems] = useState<NotificationDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const resolveItems = async () => {
      if (!rawNotifications || rawNotifications.length === 0) {
        setDisplayItems([]);
        setIsLoading(false);
        return;
      }

      const items = await resolveDisplayItems(rawNotifications);
      setDisplayItems(items);
      setIsLoading(false);
    };

    resolveItems();
  }, [rawNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await db.notifications.update(notificationId, {
      isRead: true,
      modifiedAt: new Date(),
    });
    await refreshBadgeCount();
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadRecords = await db.notifications
      .filter(
        (record) =>
          record.isRead === false &&
          record.isDelivered === true &&
          record.isDeleted === false,
      )
      .toArray();

    const now = new Date();
    await db.notifications.bulkUpdate(
      unreadRecords.map((record) => ({
        key: record.id,
        changes: { isRead: true, modifiedAt: now },
      })),
    );
    await refreshBadgeCount();
  }, []);

  return {
    notifications: displayItems,
    unreadCount,
    channel,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
};
