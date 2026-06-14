/**
 * Event type classification for calendar entries.
 * Covers both work shifts and other calendar event types.
 */
export const EventType = {
  ShiftMorning: 'ShiftMorning',
  ShiftAfternoon: 'ShiftAfternoon',
  ShiftNight: 'ShiftNight',
  Personal: 'Personal',
  Meeting: 'Meeting',
  Reminder: 'Reminder',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * CalendarEvent — unified local entity for all calendar items.
 *
 * All items displayed on the calendar (shifts, meetings, reminders, personal events)
 * are CalendarEvent records differentiated by `eventType`.
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface CalendarEvent {
  /** Client-generated UUID — globally unique primary identifier */
  id: string;

  /** User-facing event title */
  title: string;

  /** Optional event description */
  description: string | null;

  /** Event start time in UTC */
  startAt: Date;

  /** Event end time in UTC */
  endAt: Date;

  /** Whether this is an all-day event */
  isAllDay: boolean;

  /** Classification of the event (shift type, personal, meeting, reminder) */
  eventType: EventType;

  /** Override color hex (null = derived from eventType) */
  color: string | null;

  /** Last local modification timestamp (UTC) — updated on every local write */
  modifiedAt: Date;

  /** Timestamp of last successful sync (UTC). null = never synced */
  syncedAt: Date | null;

  /** Soft-delete flag — records are never physically removed until confirmed synced */
  isDeleted: boolean;
}
