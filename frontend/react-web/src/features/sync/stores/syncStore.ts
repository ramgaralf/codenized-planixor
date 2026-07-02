import { create } from 'zustand';

import { db } from '@/data/db';
import type { ConnectionStatus, SyncConfig } from '@features/sync/models';

const DEFAULT_API_BASE_PATH = '/api';
const DEFAULT_SYNC_INTERVAL_MINUTES = 5;

interface SyncState {
  config: SyncConfig | null;
  connectionStatus: ConnectionStatus;
  isPaused: boolean;
  lastSyncedAt: string | null;
  apiBasePath: string;
  syncIntervalMinutes: number;
  loadConfig: () => Promise<void>;
  saveConfig: (config: SyncConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastSyncedAt: (timestamp: string) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  config: null,
  connectionStatus: 'unconfigured',
  isPaused: false,
  lastSyncedAt: null,
  apiBasePath: DEFAULT_API_BASE_PATH,
  syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,

  loadConfig: async () => {
    const record = await db.syncConfig.get('default');
    if (record) {
      set({
        config: record,
        isPaused: record.isPaused,
        lastSyncedAt: record.lastSyncedAt,
        apiBasePath: record.apiBasePath ?? DEFAULT_API_BASE_PATH,
        syncIntervalMinutes: record.syncIntervalMinutes ?? DEFAULT_SYNC_INTERVAL_MINUTES,
        connectionStatus: record.isPaused ? 'paused' : 'active',
      });
    } else {
      set({
        config: null,
        isPaused: false,
        lastSyncedAt: null,
        apiBasePath: DEFAULT_API_BASE_PATH,
        syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
        connectionStatus: 'unconfigured',
      });
    }
  },

  saveConfig: async (config: SyncConfig) => {
    const record = { ...config, key: 'default' };
    await db.syncConfig.put(record);
    set({
      config: record,
      isPaused: record.isPaused,
      lastSyncedAt: record.lastSyncedAt,
      apiBasePath: record.apiBasePath ?? DEFAULT_API_BASE_PATH,
      syncIntervalMinutes: record.syncIntervalMinutes ?? DEFAULT_SYNC_INTERVAL_MINUTES,
      connectionStatus: 'active',
    });
  },

  clearConfig: async () => {
    await db.syncConfig.delete('default');
    set({
      config: null,
      isPaused: false,
      lastSyncedAt: null,
      apiBasePath: DEFAULT_API_BASE_PATH,
      syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
      connectionStatus: 'unconfigured',
    });
  },

  pause: () => {
    set({ isPaused: true, connectionStatus: 'paused' });
  },

  resume: () => {
    set({ isPaused: false, connectionStatus: 'active' });
  },

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  setLastSyncedAt: (timestamp: string) => {
    set({ lastSyncedAt: timestamp });
  },
}));

export type { SyncState };
