/**
 * Notification Permission Service — handles Web Notifications API permission flow.
 *
 * This service provides:
 * - Permission request flow for when user selects "System" or "Both" channel
 * - Synchronous permission state checks for the check cycle
 * - Revocation detection for inline warning display
 *
 * The channel revert logic (setting back to 'app') is called by the UI component
 * (task 7.3) based on the result returned here. This service only provides
 * permission check/request functionality.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.6**
 */

/** Result of requesting system notification permission */
export interface PermissionRequestResult {
  /** Whether system notifications are permitted */
  granted: boolean;
  /** Whether the UI should display guidance to the user */
  showGuidance: boolean;
}

/**
 * Handles the full permission request flow for system notifications.
 *
 * Flow:
 * 1. Check `Notification.permission` current state
 * 2. If 'granted': return { granted: true, showGuidance: false }
 * 3. If 'default': call `Notification.requestPermission()`, then:
 *    - Result 'granted' → { granted: true, showGuidance: false }
 *    - Result 'denied' or 'default' (dismissed) → { granted: false, showGuidance: true }
 * 4. If 'denied': return { granted: false, showGuidance: true }
 *
 * If the Notification API is not available in the browser environment,
 * returns { granted: false, showGuidance: true }.
 */
export const requestSystemPermission =
  async (): Promise<PermissionRequestResult> => {
    if (!isNotificationApiAvailable()) {
      return { granted: false, showGuidance: true };
    }

    const currentPermission = Notification.permission;

    if (currentPermission === 'granted') {
      return { granted: true, showGuidance: false };
    }

    if (currentPermission === 'denied') {
      return { granted: false, showGuidance: true };
    }

    // Permission is 'default' — request it from the user
    const result = await Notification.requestPermission();

    if (result === 'granted') {
      return { granted: true, showGuidance: false };
    }

    // 'denied' or 'default' (user dismissed the prompt)
    return { granted: false, showGuidance: true };
  };

/**
 * Synchronous check for whether system notification permission is currently granted.
 *
 * Used in the check cycle to verify permission before attempting System delivery.
 * If the Notification API is unavailable, returns false.
 */
export const isSystemPermissionGranted = (): boolean => {
  if (!isNotificationApiAvailable()) {
    return false;
  }

  return Notification.permission === 'granted';
};

/**
 * Checks whether system notification permission is currently denied.
 *
 * Used for inline warning display in the settings UI when the user has
 * "System" or "Both" selected but permission has been revoked.
 * If the Notification API is unavailable, returns true (treated as denied).
 */
export const isSystemPermissionDenied = (): boolean => {
  if (!isNotificationApiAvailable()) {
    return true;
  }

  return Notification.permission === 'denied';
};

/**
 * Checks whether the Web Notifications API is available in the current environment.
 * Returns false in environments without browser Notification support (e.g., SSR, older browsers).
 */
const isNotificationApiAvailable = (): boolean => {
  return typeof Notification !== 'undefined';
};
