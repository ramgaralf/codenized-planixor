/**
 * SyncConfig — local-only configuration for synchronization.
 *
 * This record is stored exclusively in the local device storage (IndexedDB)
 * and is NEVER included in any sync push or pull operations.
 * It uses a single-row pattern with key = 'default'.
 *
 * See Requirements 7.1, 7.2.
 */
export interface SyncConfig {
  /** Always 'default' — Dexie primary key for single-row pattern */
  key?: string;

  /** Server URL for synchronization (e.g., "https://backend.planixor.com") */
  serverUrl: string;

  /** API key for authentication with the backend */
  apiKey: string;

  /** Linked username from the validation endpoint */
  username: string;

  /** Configurable API base path segment (default "/api") */
  apiBasePath: string;

  /** Configurable sync interval in minutes (default 5) */
  syncIntervalMinutes: number;

  /** Whether sync is currently paused by the user */
  isPaused: boolean;

  /** ISO 8601 timestamp of the last successful sync, or null if never synced. Display only. */
  lastSyncedAt: string | null;

  /**
   * Per-entity pull watermark, keyed by entity, as returned by the server in `serverSyncedAt`.
   *
   * The pull filters on a column the server stamps, so the watermark has to be a value the server produced:
   * one taken from this device's clock skips whatever was stamped inside the drift between the two. Per
   * entity, because a shared one advanced past the window of an entity whose sync had failed.
   */
  entityWatermarks?: Record<string, string>;
}

/**
 * ConnectionStatus — represents the current state of the synchronization connection.
 *
 * State machine transitions:
 * - unconfigured → active: config saved and validation succeeds
 * - active → paused: user pauses
 * - active → failing: sync attempt fails
 * - paused → active: user resumes
 * - failing → active: sync attempt succeeds
 * - failing → paused: user pauses
 * - any configured → unconfigured: config cleared
 */
export type ConnectionStatus = 'unconfigured' | 'active' | 'failing' | 'paused';
