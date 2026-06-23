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

  /** Whether sync is currently paused by the user */
  isPaused: boolean;

  /** ISO 8601 timestamp of the last successful sync, or null if never synced */
  lastSyncedAt: string | null;
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
