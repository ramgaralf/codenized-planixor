import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '@/data/db';
import type { SyncConfig } from '@features/sync/models';

import { useSyncStore } from './syncStore';

const createTestConfig = (overrides?: Partial<SyncConfig>): SyncConfig => ({
  serverUrl: 'https://backend.planixor.com',
  apiKey: 'sk-test-key-123',
  username: 'pepito',
  isPaused: false,
  lastSyncedAt: null,
  ...overrides,
});

describe('syncStore', () => {
  beforeEach(async () => {
    await db.syncConfig.clear();
    useSyncStore.setState({
      config: null,
      connectionStatus: 'unconfigured',
      isPaused: false,
      lastSyncedAt: null,
    });
  });

  describe('loadConfig', () => {
    it('should set state to unconfigured when no config exists in Dexie', async () => {
      await useSyncStore.getState().loadConfig();

      const state = useSyncStore.getState();
      expect(state.config).toBeNull();
      expect(state.connectionStatus).toBe('unconfigured');
      expect(state.isPaused).toBe(false);
      expect(state.lastSyncedAt).toBeNull();
    });

    it('should load config from Dexie and set active status when not paused', async () => {
      const config = createTestConfig();
      await db.syncConfig.put({ ...config, key: 'default' });

      await useSyncStore.getState().loadConfig();

      const state = useSyncStore.getState();
      expect(state.config).toEqual({ ...config, key: 'default' });
      expect(state.connectionStatus).toBe('active');
      expect(state.isPaused).toBe(false);
      expect(state.lastSyncedAt).toBeNull();
    });

    it('should load config from Dexie and set paused status when isPaused is true', async () => {
      const config = createTestConfig({ isPaused: true, lastSyncedAt: '2025-01-15T14:30:00Z' });
      await db.syncConfig.put({ ...config, key: 'default' });

      await useSyncStore.getState().loadConfig();

      const state = useSyncStore.getState();
      expect(state.config).toEqual({ ...config, key: 'default' });
      expect(state.connectionStatus).toBe('paused');
      expect(state.isPaused).toBe(true);
      expect(state.lastSyncedAt).toBe('2025-01-15T14:30:00Z');
    });
  });

  describe('saveConfig', () => {
    it('should persist config to Dexie and set connectionStatus to active', async () => {
      const config = createTestConfig();

      await useSyncStore.getState().saveConfig(config);

      const state = useSyncStore.getState();
      expect(state.config).toEqual({ ...config, key: 'default' });
      expect(state.connectionStatus).toBe('active');

      const persisted = await db.syncConfig.get('default');
      expect(persisted).toEqual({ ...config, key: 'default' });
    });

    it('should overwrite existing config in Dexie', async () => {
      const original = createTestConfig({ serverUrl: 'https://old.example.com' });
      await db.syncConfig.put({ ...original, key: 'default' });

      const updated = createTestConfig({ serverUrl: 'https://new.example.com' });
      await useSyncStore.getState().saveConfig(updated);

      const persisted = await db.syncConfig.get('default');
      expect(persisted?.serverUrl).toBe('https://new.example.com');
    });
  });

  describe('clearConfig', () => {
    it('should remove config from Dexie and reset state to unconfigured', async () => {
      const config = createTestConfig();
      await db.syncConfig.put({ ...config, key: 'default' });
      useSyncStore.setState({
        config: { ...config, key: 'default' },
        connectionStatus: 'active',
        isPaused: false,
        lastSyncedAt: '2025-01-15T14:30:00Z',
      });

      await useSyncStore.getState().clearConfig();

      const state = useSyncStore.getState();
      expect(state.config).toBeNull();
      expect(state.connectionStatus).toBe('unconfigured');
      expect(state.isPaused).toBe(false);
      expect(state.lastSyncedAt).toBeNull();

      const persisted = await db.syncConfig.get('default');
      expect(persisted).toBeUndefined();
    });
  });

  describe('pause', () => {
    it('should set isPaused to true and connectionStatus to paused', () => {
      useSyncStore.setState({ connectionStatus: 'active', isPaused: false });

      useSyncStore.getState().pause();

      const state = useSyncStore.getState();
      expect(state.isPaused).toBe(true);
      expect(state.connectionStatus).toBe('paused');
    });
  });

  describe('resume', () => {
    it('should set isPaused to false and connectionStatus to active', () => {
      useSyncStore.setState({ connectionStatus: 'paused', isPaused: true });

      useSyncStore.getState().resume();

      const state = useSyncStore.getState();
      expect(state.isPaused).toBe(false);
      expect(state.connectionStatus).toBe('active');
    });
  });

  describe('setConnectionStatus', () => {
    it('should update connectionStatus to the provided value', () => {
      useSyncStore.getState().setConnectionStatus('failing');

      expect(useSyncStore.getState().connectionStatus).toBe('failing');
    });
  });

  describe('setLastSyncedAt', () => {
    it('should update the lastSyncedAt timestamp', () => {
      useSyncStore.getState().setLastSyncedAt('2025-06-01T10:00:00Z');

      expect(useSyncStore.getState().lastSyncedAt).toBe('2025-06-01T10:00:00Z');
    });
  });
});
