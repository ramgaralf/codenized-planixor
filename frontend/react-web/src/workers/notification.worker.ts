/**
 * Notification Web Worker — background timer for notification check cycles.
 *
 * This worker keeps a reliable 1-minute interval timer alive and delegates
 * actual notification delivery to the main thread (where the Notification API
 * is available). The worker sends `RUN_CYCLE` messages to the main thread,
 * which executes the check cycle and handles system notification delivery.
 *
 * Communication protocol:
 * - Receives: `{ type: 'CHECK_NOW' }` — requests an immediate cycle on the main thread
 * - Sends: `{ type: 'RUN_CYCLE' }` — tells the main thread to execute a check cycle
 *
 * **Validates: Requirements 6.2, 6.3, 6.6**
 */

/** Message types the worker can receive from the main thread */
interface WorkerIncomingMessage {
  type: 'CHECK_NOW';
}

/** Message types the worker sends to the main thread */
export interface WorkerOutgoingMessage {
  type: 'RUN_CYCLE';
}

/** 1-minute interval in milliseconds */
const CHECK_INTERVAL_MS = 60_000;

/**
 * Requests the main thread to run a notification check cycle.
 * The main thread has access to the Notification API, which is
 * unavailable in Web Worker contexts.
 */
const requestCheckCycle = (): void => {
  self.postMessage({ type: 'RUN_CYCLE' } satisfies WorkerOutgoingMessage);
};

// Start the periodic timer (every 1 minute)
setInterval(requestCheckCycle, CHECK_INTERVAL_MS);

// Request an initial cycle when the worker starts
requestCheckCycle();

// Handle incoming messages from the main thread
self.onmessage = (event: MessageEvent<WorkerIncomingMessage>) => {
  if (event.data.type === 'CHECK_NOW') {
    requestCheckCycle();
  }
};
