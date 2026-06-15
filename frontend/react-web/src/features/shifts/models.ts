/**
 * Shift — local entity for work shift templates.
 *
 * Shifts are reusable work period definitions that can be assigned
 * to calendar events. All fields are persisted locally in IndexedDB
 * via Dexie (offline-first).
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface Shift {
  /** Client-generated UUID — globally unique primary identifier */
  id: string;

  /** User-facing shift name (1–50 characters after trim) */
  name: string;

  /** Single emoji representing the shift */
  icon: string;

  /** Hex color from the predefined palette */
  backgroundColor: string;

  /** Start time as minutes from midnight (0–1439) */
  startTime: number;

  /** End time as minutes from midnight (0–1439) */
  endTime: number;

  /** Total working minutes (1–1440) */
  hoursWorked: number;

  /** Whether the shift is currently active or deactivated */
  isActive: boolean;

  /** Original creation timestamp (UTC) */
  createdAt: Date;

  /** Last local modification timestamp (UTC) — updated on every local write */
  modifiedAt: Date;

  /** Timestamp of last successful sync (UTC). null = never synced */
  syncedAt: Date | null;

  /** Soft-delete flag — records are never physically removed until confirmed synced */
  isDeleted: boolean;
}
