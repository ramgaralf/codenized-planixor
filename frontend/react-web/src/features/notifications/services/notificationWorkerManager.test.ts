import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getUnreadCountFromWorker,
  registerNotificationWorker,
  subscribeToBadgeCount,
  unregisterNotificationWorker,
} from './notificationWorkerManager';

// Mock the notification service (runs on main thread now)
vi.mock('@features/notifications/services/notificationService', () => ({
  runCheckCycle: vi.fn().mockResolvedValue(undefined),
  getUnreadCount: vi.fn().mockResolvedValue(0),
}));

import { runCheckCycle, getUnreadCount } from '@features/notifications/services/notificationService';

/**
 * Mock Worker class for testing.
 * Captures the message handler and allows simulating messages/errors.
 */
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

let mockWorkerInstance: MockWorker;

describe('notificationWorkerManager', () => {
  beforeEach(() => {
    mockWorkerInstance = new MockWorker();

    // Mock the Worker constructor globally
    vi.stubGlobal('Worker', vi.fn(() => mockWorkerInstance));

    // Reset mocks
    vi.mocked(runCheckCycle).mockResolvedValue(undefined);
    vi.mocked(getUnreadCount).mockResolvedValue(0);
  });

  afterEach(() => {
    unregisterNotificationWorker();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('registerNotificationWorker', () => {
    it('should create a Worker instance with module type on first call', () => {
      registerNotificationWorker();

      expect(Worker).toHaveBeenCalledTimes(1);
      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        { type: 'module' },
      );
    });

    it('should be idempotent — second call does not create another Worker', () => {
      registerNotificationWorker();
      registerNotificationWorker();

      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it('should set up visibilitychange event listener on document', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener');

      registerNotificationWorker();

      expect(addEventSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
    });

    it('should attach onmessage and onerror handlers to the Worker', () => {
      registerNotificationWorker();

      expect(mockWorkerInstance.onmessage).toBeTypeOf('function');
      expect(mockWorkerInstance.onerror).toBeTypeOf('function');
    });
  });

  describe('RUN_CYCLE message handling', () => {
    it('should run check cycle on main thread when Worker sends RUN_CYCLE', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(5);
      registerNotificationWorker();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      // Allow async operations to complete
      await vi.waitFor(() => {
        expect(runCheckCycle).toHaveBeenCalledTimes(1);
      });

      expect(getUnreadCount).toHaveBeenCalledTimes(1);
    });

    it('should update badge count after successful check cycle', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(7);
      registerNotificationWorker();

      const listener = vi.fn();
      subscribeToBadgeCount(listener);
      listener.mockClear();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      await vi.waitFor(() => {
        expect(listener).toHaveBeenCalledWith(7);
      });
    });

    it('should not crash if check cycle throws', async () => {
      vi.mocked(runCheckCycle).mockRejectedValue(new Error('DB failure'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      registerNotificationWorker();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[NotificationWorkerManager] Check cycle failed:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should prevent concurrent check cycles', async () => {
      // Make runCheckCycle hang until resolved
      let resolveCheckCycle: () => void;
      vi.mocked(runCheckCycle).mockImplementation(
        () => new Promise<void>((resolve) => { resolveCheckCycle = resolve; }),
      );
      registerNotificationWorker();

      // Send two RUN_CYCLE messages in quick succession
      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      // Resolve the first cycle
      resolveCheckCycle!();

      await vi.waitFor(() => {
        expect(runCheckCycle).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('visibilitychange handling', () => {
    it('should run check cycle on main thread when document becomes visible', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(3);
      registerNotificationWorker();

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      document.dispatchEvent(new Event('visibilitychange'));

      await vi.waitFor(() => {
        expect(runCheckCycle).toHaveBeenCalledTimes(1);
      });
    });

    it('should not run check cycle when document becomes hidden', () => {
      registerNotificationWorker();

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      document.dispatchEvent(new Event('visibilitychange'));

      expect(runCheckCycle).not.toHaveBeenCalled();
    });
  });

  describe('Worker error handling', () => {
    it('should terminate old Worker and create new one on error', () => {
      registerNotificationWorker();

      const secondMockWorker = new MockWorker();
      vi.mocked(Worker).mockImplementation(() => secondMockWorker as unknown as Worker);

      // Simulate Worker error
      mockWorkerInstance.onerror!();

      // Original Worker should be terminated
      expect(mockWorkerInstance.terminate).toHaveBeenCalled();

      // New Worker should be created
      expect(Worker).toHaveBeenCalledTimes(2);
    });

    it('should run check cycle on main thread after Worker re-registration', async () => {
      registerNotificationWorker();

      const secondMockWorker = new MockWorker();
      vi.mocked(Worker).mockImplementation(() => secondMockWorker as unknown as Worker);

      mockWorkerInstance.onerror!();

      await vi.waitFor(() => {
        expect(runCheckCycle).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('subscribeToBadgeCount', () => {
    it('should invoke listener immediately with current count on subscribe', () => {
      registerNotificationWorker();

      const listener = vi.fn();
      subscribeToBadgeCount(listener);

      expect(listener).toHaveBeenCalledWith(0);
    });

    it('should invoke all subscribers on badge count change', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(12);
      registerNotificationWorker();

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      subscribeToBadgeCount(listener1);
      subscribeToBadgeCount(listener2);
      listener1.mockClear();
      listener2.mockClear();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      await vi.waitFor(() => {
        expect(listener1).toHaveBeenCalledWith(12);
        expect(listener2).toHaveBeenCalledWith(12);
      });
    });

    it('should stop notifying after unsubscribe', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(99);
      registerNotificationWorker();

      const listener = vi.fn();
      const unsubscribe = subscribeToBadgeCount(listener);
      listener.mockClear();

      unsubscribe();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      // Give time for the async cycle to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCountFromWorker', () => {
    it('should return 0 before any cycles complete', () => {
      expect(getUnreadCountFromWorker()).toBe(0);
    });

    it('should return the last badge count after a cycle completes', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(42);
      registerNotificationWorker();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      await vi.waitFor(() => {
        expect(getUnreadCountFromWorker()).toBe(42);
      });
    });
  });

  describe('unregisterNotificationWorker', () => {
    it('should terminate the Worker and remove event listeners', () => {
      const removeEventSpy = vi.spyOn(document, 'removeEventListener');

      registerNotificationWorker();
      unregisterNotificationWorker();

      expect(mockWorkerInstance.terminate).toHaveBeenCalled();
      expect(removeEventSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
    });

    it('should reset badge count to 0', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(10);
      registerNotificationWorker();

      mockWorkerInstance.onmessage!({
        data: { type: 'RUN_CYCLE' },
      } as MessageEvent);

      await vi.waitFor(() => {
        expect(getUnreadCountFromWorker()).toBe(10);
      });

      unregisterNotificationWorker();

      expect(getUnreadCountFromWorker()).toBe(0);
    });

    it('should allow re-registration after unregister', () => {
      registerNotificationWorker();
      unregisterNotificationWorker();

      const newMock = new MockWorker();
      vi.mocked(Worker).mockImplementation(() => newMock as unknown as Worker);

      registerNotificationWorker();

      expect(Worker).toHaveBeenCalledTimes(2);
      expect(newMock.onmessage).toBeTypeOf('function');
    });
  });
});
