import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isSystemPermissionDenied,
  isSystemPermissionGranted,
  requestSystemPermission,
} from './notificationPermissions';

/**
 * Tests for the Notification Permission Service.
 *
 * We mock the global Notification object since jsdom does not provide
 * the Web Notifications API.
 */
describe('notificationPermissions', () => {
  const mockRequestPermission = vi.fn<() => Promise<NotificationPermission>>();

  beforeEach(() => {
    // Set up a minimal Notification mock on globalThis
    Object.defineProperty(globalThis, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestSystemPermission', () => {
    it('should return granted:true when permission is already granted', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      const result = await requestSystemPermission();

      expect(result).toEqual({ granted: true, showGuidance: false });
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should return granted:false with guidance when permission is denied', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      const result = await requestSystemPermission();

      expect(result).toEqual({ granted: false, showGuidance: true });
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should request permission when state is default and user grants', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'default',
        configurable: true,
      });
      mockRequestPermission.mockResolvedValue('granted');

      const result = await requestSystemPermission();

      expect(result).toEqual({ granted: true, showGuidance: false });
      expect(mockRequestPermission).toHaveBeenCalledOnce();
    });

    it('should return guidance when user denies the permission prompt', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'default',
        configurable: true,
      });
      mockRequestPermission.mockResolvedValue('denied');

      const result = await requestSystemPermission();

      expect(result).toEqual({ granted: false, showGuidance: true });
      expect(mockRequestPermission).toHaveBeenCalledOnce();
    });

    it('should return guidance when user dismisses the permission prompt', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'default',
        configurable: true,
      });
      mockRequestPermission.mockResolvedValue('default');

      const result = await requestSystemPermission();

      expect(result).toEqual({ granted: false, showGuidance: true });
      expect(mockRequestPermission).toHaveBeenCalledOnce();
    });

    it('should return guidance when Notification API is unavailable', async () => {
      // Remove the Notification object to simulate unavailable API
      Object.defineProperty(globalThis, 'Notification', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await requestSystemPermission();

      expect(result).toEqual({ granted: false, showGuidance: true });
    });
  });

  describe('isSystemPermissionGranted', () => {
    it('should return true when permission is granted', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(isSystemPermissionGranted()).toBe(true);
    });

    it('should return false when permission is default', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'default',
        configurable: true,
      });

      expect(isSystemPermissionGranted()).toBe(false);
    });

    it('should return false when permission is denied', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(isSystemPermissionGranted()).toBe(false);
    });

    it('should return false when Notification API is unavailable', () => {
      Object.defineProperty(globalThis, 'Notification', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isSystemPermissionGranted()).toBe(false);
    });
  });

  describe('isSystemPermissionDenied', () => {
    it('should return true when permission is denied', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(isSystemPermissionDenied()).toBe(true);
    });

    it('should return false when permission is granted', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(isSystemPermissionDenied()).toBe(false);
    });

    it('should return false when permission is default', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'default',
        configurable: true,
      });

      expect(isSystemPermissionDenied()).toBe(false);
    });

    it('should return true when Notification API is unavailable', () => {
      Object.defineProperty(globalThis, 'Notification', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isSystemPermissionDenied()).toBe(true);
    });
  });
});
