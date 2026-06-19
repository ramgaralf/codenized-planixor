/**
 * AnnualHoursConfig — local entity for annual working hours configuration.
 *
 * Stores the configured required working hours for a specific year.
 * Used by the annual report to compute surplus/deficit against actual
 * hours worked. All fields are persisted locally in IndexedDB via Dexie
 * (offline-first).
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface AnnualHoursConfig {
  /** Client-generated UUID — globally unique primary identifier */
  id: string;

  /** Calendar year this configuration applies to (range 2000–2100) */
  year: number;

  /** Total required annual working hours in whole hours (range 1–8784) */
  configuredHours: number;

  /** Last local modification timestamp (UTC) — updated on every local write */
  modifiedAt: Date;

  /** Timestamp of last successful sync (UTC). null = never synced */
  syncedAt: Date | null;

  /** Soft-delete flag — records are never physically removed until confirmed synced */
  isDeleted: boolean;
}

/**
 * TypeAggregate — aggregated hours data for a single shift or reminder type.
 *
 * Produced by the aggregation engine after grouping calendar events by
 * their eventTypeId and computing totals and percentages.
 */
export interface TypeAggregate {
  /** The eventTypeId (shift or reminder id) */
  typeId: string;

  /** Display name of the shift or reminder type */
  name: string;

  /** Emoji icon of the shift or reminder type */
  icon: string;

  /** Hex background color of the shift or reminder type */
  backgroundColor: string;

  /** Total minutes for this type within the selected period */
  totalMinutes: number;

  /** Number of calendar events of this type within the selected period */
  eventCount: number;

  /** Percentage of total (relative to grand total or configured hours) */
  percentage: number;
}

/**
 * ReportData — output of the aggregation engine.
 *
 * Contains all computed data needed to render the reports page charts
 * and tables for a given period (month or year).
 */
export interface ReportData {
  /** Aggregated data for each shift type */
  shifts: TypeAggregate[];

  /** Aggregated data for each reminder type */
  reminders: TypeAggregate[];

  /** Grand total of all shift minutes for the period */
  totalShiftMinutes: number;

  /** Grand total of all reminder minutes for the period */
  totalReminderMinutes: number;

  /** Annual hours config for the selected year (only populated in year mode) */
  annualConfig: AnnualHoursConfig | null;
}
