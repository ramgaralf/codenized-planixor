/**
 * Reminder — local entity for reusable reminder templates.
 *
 * Reminders are reusable definitions that can be assigned to calendar
 * events of the "reminder" type. All fields are persisted locally in
 * IndexedDB via Dexie (offline-first).
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface Reminder {
  /** Client-generated UUID — globally unique primary identifier */
  id: string;

  /** User-facing reminder name (1–50 characters after trim) */
  name: string;

  /** Single emoji representing the reminder */
  icon: string;

  /** Hex color from the predefined palette */
  backgroundColor: string;

  /** Whether the reminder is currently active or deactivated */
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
