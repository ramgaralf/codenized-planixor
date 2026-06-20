/**
 * NotificationRecord — local entity for scheduled/delivered notification records.
 *
 * Each record represents a single notification instance tied to a calendar event
 * and a specific alert offset. Records are created when a user configures alerts
 * on a calendar event and are delivered by the background notification service.
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface NotificationRecord {
  /** Client-generated UUID — globally unique primary identifier */
  id: string;

  /** UUID referencing the associated calendar event */
  calendarEventId: string;

  /** Minutes before event start when this notification triggers (0, 10, 60, or 1440) */
  alertOffset: number;

  /** Computed UTC date-time when this notification should fire (event start - alertOffset) */
  triggerTime: Date;

  /** Whether the notification has been delivered to the user */
  isDelivered: boolean;

  /** Whether the user has read/dismissed this notification */
  isRead: boolean;

  /** Last local modification timestamp (UTC) — updated on every local write */
  modifiedAt: Date;

  /** Timestamp of last successful sync (UTC). null = never synced */
  syncedAt: Date | null;

  /** Soft-delete flag — records are never physically removed until confirmed synced */
  isDeleted: boolean;
}

/**
 * NotificationSettingsRecord — device-local notification channel preference.
 *
 * Stored in IndexedDB (Dexie) so it is accessible from both the main thread
 * and the Web Worker that runs the notification check cycle.
 * This setting is NOT synced — it is device-specific.
 */
export interface NotificationSettingsRecord {
  /** Setting key identifier (e.g., 'channel') */
  key: string;

  /** The setting value */
  value: string;
}

/**
 * Notification delivery channel options.
 * - 'app': In-app notifications only (Notification View)
 * - 'system': Native OS notifications only (Web Notifications API)
 * - 'both': Both in-app and native OS notifications
 */
export type NotificationChannel = 'app' | 'system' | 'both';

/**
 * Valid alert offset values in minutes before event start.
 * - 0: At start time
 * - 10: 10 minutes before
 * - 60: 1 hour before
 * - 1440: 1 day before
 */
export type AlertOffset = 0 | 10 | 60 | 1440;

/** All valid alert offset values */
export const ALERT_OFFSETS: readonly AlertOffset[] = [0, 10, 60, 1440] as const;

/** Maximum number of alert offsets allowed per calendar event */
export const MAX_ALERT_OFFSETS = 4;

/**
 * Validates an alertOffsets value.
 *
 * Accepted if and only if:
 * - It is an array
 * - Contains 0–4 elements
 * - Each element is one of {0, 10, 60, 1440}
 * - No duplicate values
 *
 * @returns true if the value is a valid alertOffsets array
 */
export const isValidAlertOffsets = (value: unknown): value is AlertOffset[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length > MAX_ALERT_OFFSETS) {
    return false;
  }

  const validSet = new Set<number>(ALERT_OFFSETS);
  const seen = new Set<number>();

  for (const item of value) {
    if (typeof item !== 'number' || !validSet.has(item)) {
      return false;
    }

    if (seen.has(item)) {
      return false;
    }

    seen.add(item);
  }

  return true;
};
