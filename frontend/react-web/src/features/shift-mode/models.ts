/**
 * ShiftModeSetting — local entity for the shift mode toggle.
 *
 * Only one record exists per device. Created on first access with enabled=false.
 * Syncs bidirectionally with the backend when sync is configured.
 *
 * Change tracking fields (id, modifiedAt, syncedAt, isDeleted) support
 * the offline-first sync strategy defined in global-sync-strategy.md.
 */
export interface ShiftModeSetting {
  /** Client-generated UUID */
  id: string;
  /** Whether shift mode is enabled */
  enabled: boolean;
  /** Last local modification timestamp (UTC) */
  modifiedAt: Date;
  /** Timestamp of last successful sync (UTC). null = never synced */
  syncedAt: Date | null;
  /** Soft-delete flag */
  isDeleted: boolean;
}
