/**
 * Notification Worker Manager — manages Web Worker registration and lifecycle.
 *
 * Responsibilities:
 * - Register the notification Web Worker on app load
 * - Run check cycles on the main thread (where Notification API is available)
 * - Listen for `visibilitychange` to trigger immediate check cycles
 * - Re-register the Worker on error (crash recovery)
 * - Update a reactive badge count store from check cycle results
 * - Expose a subscribe pattern for components to react to badge count changes
 *
 * The Worker acts as a timer only — it sends `RUN_CYCLE` messages to the main
 * thread, which executes the actual notification delivery logic. This ensures
 * system notifications (Web Notifications API) work correctly, as that API is
 * unavailable inside Web Workers.
 *
 * **Validates: Requirements 6.4, 6.5, 2.7**
 */

import { runCheckCycle, getUnreadCount } from '@features/notifications/services/notificationService';

/**
 * Message types the Worker sends to the main thread.
 * Must be kept in sync with WorkerOutgoingMessage in notification.worker.ts.
 */
interface WorkerOutgoingMessage {
  type: 'RUN_CYCLE';
}

/** Callback type for badge count subscribers */
type BadgeCountListener = (count: number) => void;

/** Current unread badge count */
let badgeCount = 0;

/** Set of subscriber callbacks */
const listeners = new Set<BadgeCountListener>();

/** Reference to the active Worker instance */
let worker: Worker | null = null;

/** Whether the worker manager has been initialized */
let initialized = false;

/** Flag to prevent concurrent check cycles */
let cycleInProgress = false;

/**
 * Notifies all subscribers of a badge count change.
 */
const notifyListeners = (count: number): void => {
  badgeCount = count;
  for (const listener of listeners) {
    listener(count);
  }
};

/**
 * Executes a check cycle on the main thread.
 * This runs the notification delivery logic where the Notification API
 * is available, then updates the badge count for all subscribers.
 *
 * Prevents concurrent executions via a guard flag.
 */
const executeCheckCycleOnMainThread = async (): Promise<void> => {
  if (cycleInProgress) {
    return;
  }

  cycleInProgress = true;
  try {
    await runCheckCycle();
    const unreadCount = await getUnreadCount();
    notifyListeners(unreadCount);
  } catch (error) {
    console.error('[NotificationWorkerManager] Check cycle failed:', error);
  } finally {
    cycleInProgress = false;
  }
};

/**
 * Handles incoming messages from the Worker.
 *
 * - `RUN_CYCLE`: Worker timer fired — run the check cycle on main thread
 */
const handleWorkerMessage = (event: MessageEvent<WorkerOutgoingMessage>): void => {
  const { type } = event.data;

  if (type === 'RUN_CYCLE') {
    void executeCheckCycleOnMainThread();
  }
};

/**
 * Handles Worker errors by re-registering and triggering an immediate cycle.
 *
 * When the Worker terminates unexpectedly or throws an unhandled error,
 * this handler tears down the old Worker and creates a new one.
 *
 * **Validates: Requirement 6.5**
 */
const handleWorkerError = (): void => {
  console.error('[NotificationWorkerManager] Worker error detected — re-registering');
  terminateWorker();
  createWorker();
  void executeCheckCycleOnMainThread();
};

/**
 * Creates a new Worker instance and attaches message/error handlers.
 */
const createWorker = (): void => {
  worker = new Worker(
    new URL('../../../workers/notification.worker.ts', import.meta.url),
    { type: 'module' },
  );

  worker.onmessage = handleWorkerMessage;
  worker.onerror = handleWorkerError;
};

/**
 * Terminates the current Worker instance and cleans up references.
 */
const terminateWorker = (): void => {
  if (worker) {
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    worker = null;
  }
};

/**
 * Handles the `visibilitychange` event on the document.
 *
 * When the document becomes visible (user returns to the app/tab),
 * runs a check cycle directly on the main thread for immediate
 * notification delivery.
 *
 * **Validates: Requirements 6.4, 2.7**
 */
const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'visible') {
    void executeCheckCycleOnMainThread();
  }
};

/**
 * Registers the notification Web Worker and sets up lifecycle management.
 *
 * This function is idempotent — calling it multiple times will not
 * create duplicate Workers or event listeners.
 *
 * Call this once on app load (e.g., in App.tsx useEffect or a provider).
 *
 * **Validates: Requirements 6.4, 6.5, 2.7**
 */
export const registerNotificationWorker = (): void => {
  if (initialized) {
    return;
  }

  initialized = true;

  createWorker();

  document.addEventListener('visibilitychange', handleVisibilityChange);
};

/**
 * Returns the current unread badge count.
 *
 * This is the synchronous snapshot — for reactive updates, use `subscribeToBadgeCount`.
 */
export const getUnreadCountFromWorker = (): number => {
  return badgeCount;
};

/**
 * Subscribes a callback to badge count updates.
 *
 * Returns an unsubscribe function. The callback is invoked immediately
 * with the current badge count upon subscription.
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToBadgeCount((count) => {
 *   console.log('Badge count:', count);
 * });
 * // Later...
 * unsubscribe();
 * ```
 */
export const subscribeToBadgeCount = (listener: BadgeCountListener): (() => void) => {
  listeners.add(listener);

  // Immediately notify with current count
  listener(badgeCount);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * Forces an immediate badge count refresh by running a check cycle.
 * Call this after any operation that modifies notification records
 * (event create/update/delete) so the UI updates immediately.
 */
export const triggerImmediateCheckCycle = async (): Promise<void> => {
  await executeCheckCycleOnMainThread();
};

/**
 * Refreshes the badge count by querying the current unread count from IndexedDB
 * and notifying all subscribers. Does NOT run a check cycle.
 * Call this after operations that change read/delivery state (markAsRead, markAllAsRead).
 */
export const refreshBadgeCount = async (): Promise<void> => {
  const unreadCount = await getUnreadCount();
  notifyListeners(unreadCount);
};

/**
 * Unregisters the notification Worker and removes all event listeners.
 *
 * Primarily useful for testing and cleanup scenarios.
 */
export const unregisterNotificationWorker = (): void => {
  terminateWorker();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  listeners.clear();
  badgeCount = 0;
  initialized = false;
  cycleInProgress = false;
};
