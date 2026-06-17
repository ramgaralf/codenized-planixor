/**
 * CalendarEvent — local entity for scheduled calendar occurrences.
 *
 * Calendar events reference a previously created Shift or Reminder
 * definition and are displayed on the calendar in four view modes
 * (Day, Week, Month, Year). All fields are persisted locally in
 * IndexedDB via Dexie (offline-first).
 *
 * Events can span one or more days via startDay/endDay. For shift events,
 * times are read-only (from the shift definition) and endDay is auto-set
 * when crossing midnight. For reminder events, times are editable and
 * totalHours is computed from the time/day difference.
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface CalendarEvent {
  /** Client-generated UUID — globally unique primary identifier */
  id: string;

  /** Type discriminator: references either a Shift or Reminder definition */
  eventType: 'shift' | 'reminder';

  /** UUID referencing the Shift or Reminder definition */
  eventTypeId: string;

  /** Start calendar date of the event (ISO date string YYYY-MM-DD) */
  startDay: string;

  /** End calendar date of the event (ISO date string YYYY-MM-DD, >= startDay) */
  endDay: string;

  /** Start time as minutes from midnight (0–1439) */
  startTime: number;

  /** End time as minutes from midnight (0–1439) */
  endTime: number;

  /**
   * Total duration in minutes (read-only, computed).
   * For shifts: derived from the shift's hoursWorked field.
   * For reminders: calculated from day difference + time difference.
   */
  totalHours: number;

  /** Optional notes (max 250 characters). null = no notes */
  notes: string | null;

  /** Last local modification timestamp (UTC) — updated on every local write */
  modifiedAt: Date;

  /** Timestamp of last successful sync (UTC). null = never synced */
  syncedAt: Date | null;

  /** Soft-delete flag — records are never physically removed until confirmed synced */
  isDeleted: boolean;
}

/**
 * CalendarEventDisplay — derived at read time (not persisted).
 *
 * Extends CalendarEvent with display fields resolved from the
 * referenced Shift or Reminder definition. These fields always
 * reflect the latest state of the referenced entity.
 */
export interface CalendarEventDisplay extends CalendarEvent {
  /** Display name from the referenced shift/reminder (max 50 characters) */
  name: string;

  /** Single emoji from the referenced shift/reminder */
  icon: string;

  /** Hex color from the referenced shift/reminder's predefined palette */
  backgroundColor: string;
}

/**
 * ValidationResult — returned by pure validation functions.
 *
 * Used by both form-level (UI) and service-level (persistence)
 * validation to enforce data integrity via dual validation.
 */
export interface ValidationResult {
  /** Whether all validation checks passed */
  isValid: boolean;

  /** Field-level error messages keyed by field name */
  errors: Record<string, string>;
}
