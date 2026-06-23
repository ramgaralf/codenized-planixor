import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSyncStore } from '@features/sync/stores/syncStore';

import {
  isSyncAllowed,
  resumeSyncWorker,
  startSyncController,
  stopSyncController,
  stopSyncWorker,
} from './syncServiceController';

// Mock the sync modules to avoid real DB/network calls
vi.mock('@features/calendar-events/services/calendarEventSync', () => ({
  syncCalendarEvents: vi.fn().mockResolvedValue(undefined),
  pushCalendarEvents: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@features/notifications/services/notificationSync', () => ({
  syncNotificationRecords: vi.fn().mockResolvedValue(undefined),
  pushNotificationRecords: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@features/reports/services/annualHoursConfigSync', () => ({
  syncAnnualHoursConfig: vi.fn().mockResolvedValue(undefined),
  pushAnnualHoursConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/data/db', () => ({
  db: {
    syncConfig: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('syncServiceController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopSyncController();
    useSyncStore.setState({
      config: null,
      connectionStatus: 'unconfigured',
      isPaused: false,
      lastSyncedAt: null,
    });
  });

  afterEach(() => {
    stopSyncWorker();
    vi.useRealTimers();
  });

  describe('startSyncController', () => {
    it('should subscribe to store changes when called', () => {
      const subscribeSpy = vi.spyOn(useSyncStore, 'subscribe');
      startSyncController();
      expect(subscribeSpy).toHaveBeenCalledOnce();
      subscribeSpy.mockRestore();
    });

    it('should not create duplicate subscriptions when called multiple times', () => {
      const subscribeSpy = vi.spyOn(useSyncStore, 'subscribe');
      startSyncController();
      startSyncController();
      expect(subscribeSpy).toHaveBeenCalledOnce();
      subscribeSpy.mockRestore();
    });
  });

  describe('stopSyncController', () => {
    it('should unsubscribe from store changes', () => {
      const mockUnsubscribe = vi.fn();
      vi.spyOn(useSyncStore, 'subscribe').mockReturnValue(mockUnsubscribe);
      startSyncController();
      stopSyncController();
      expect(mockUnsubscribe).toHaveBeenCalledOnce();
    });

    it('should allow startSyncController to work again after stopping', () => {
      const subscribeSpy = vi.spyOn(useSyncStore, 'subscribe');
      startSyncController();
      stopSyncController();
      startSyncController();
      expect(subscribeSpy).toHaveBeenCalledTimes(2);
      subscribeSpy.mockRestore();
    });

    it('should be a no-op when controller is not started', () => {
      expect(() => stopSyncController()).not.toThrow();
    });
  });

  describe('isSyncAllowed', () => {
    it('should return false when config is null', () => {
      useSyncStore.setState({ config: null, isPaused: false });
      expect(isSyncAllowed()).toBe(false);
    });

    it('should return false when isPaused is true', () => {
      useSyncStore.setState({
        config: {
          serverUrl: 'https://example.com',
          apiKey: 'test-key',
          username: 'user1',
          isPaused: true,
          lastSyncedAt: null,
        },
        isPaused: true,
      });
      expect(isSyncAllowed()).toBe(false);
    });

    it('should return true when config is present and not paused', () => {
      useSyncStore.setState({
        config: {
          serverUrl: 'https://example.com',
          apiKey: 'test-key',
          username: 'user1',
          isPaused: false,
          lastSyncedAt: null,
        },
        isPaused: false,
      });
      expect(isSyncAllowed()).toBe(true);
    });
  });

  describe('resumeSyncWorker', () => {
    it('should start a periodic interval', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

      useSyncStore.setState({
        config: {
          serverUrl: 'https://example.com',
          apiKey: 'test-key',
          username: 'user1',
          isPaused: false,
          lastSyncedAt: null,
        },
        isPaused: false,
      });

      resumeSyncWorker();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300_000);
      setIntervalSpy.mockRestore();
    });

    it('should add a visibilitychange event listener', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener');

      useSyncStore.setState({
        config: {
          serverUrl: 'https://example.com',
          apiKey: 'test-key',
          username: 'user1',
          isPaused: false,
          lastSyncedAt: null,
        },
        isPaused: false,
      });

      resumeSyncWorker();

      expect(addEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      addEventSpy.mockRestore();
    });
  });

  describe('stopSyncWorker', () => {
    it('should clear the interval set by resumeSyncWorker', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      useSyncStore.setState({
        config: {
          serverUrl: 'https://example.com',
          apiKey: 'test-key',
          username: 'user1',
          isPaused: false,
          lastSyncedAt: null,
        },
        isPaused: false,
      });

      resumeSyncWorker();
      stopSyncWorker();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should remove the visibilitychange event listener', () => {
      const removeEventSpy = vi.spyOn(document, 'removeEventListener');

      useSyncStore.setState({
        config: {
          serverUrl: 'https://example.com',
          apiKey: 'test-key',
          username: 'user1',
          isPaused: false,
          lastSyncedAt: null,
        },
        isPaused: false,
      });

      resumeSyncWorker();
      stopSyncWorker();

      expect(removeEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      removeEventSpy.mockRestore();
    });
  });
});
