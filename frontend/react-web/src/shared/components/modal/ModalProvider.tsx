import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ConfirmModal } from './ConfirmModal';
import { InfoModal } from './InfoModal';
import { ModalContext } from './ModalContextValue';
import type { ModalConfig, ModalContextValue } from './ModalContextValue';

interface ModalProviderProps {
  children: ReactNode;
}

/**
 * ModalProvider — context provider that manages a FIFO queue of modals.
 *
 * Only one modal is visible at a time. When dismissed, the next queued modal appears.
 * Wraps the app to provide modal capabilities to any child component.
 *
 * **Validates: Requirements 10.1, 10.2, 10.7**
 */
export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [, setQueue] = useState<ModalConfig[]>([]);
  const [current, setCurrent] = useState<ModalConfig | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Track whether a modal is showing to handle synchronous batched calls
  const hasCurrentRef = useRef(false);

  const show = useCallback(
    (config: ModalConfig) => {
      // Capture the currently focused element as the trigger (only for first modal)
      const activeEl = document.activeElement as HTMLElement | null;

      if (!hasCurrentRef.current) {
        hasCurrentRef.current = true;
        triggerRef.current = activeEl;
        setCurrent(config);
      } else {
        setQueue((prev) => [...prev, config]);
      }
    },
    [],
  );

  const advanceQueue = useCallback(() => {
    setQueue((prev) => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setCurrent(next ?? null);
        return rest;
      }
      setCurrent(null);
      hasCurrentRef.current = false;
      return prev;
    });
  }, []);

  const restoreFocus = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger && typeof trigger.focus === 'function') {
      requestAnimationFrame(() => {
        trigger.focus();
      });
    }
  }, []);

  const dismiss = useCallback(() => {
    restoreFocus();
    advanceQueue();
  }, [restoreFocus, advanceQueue]);

  const handleCancel = useCallback(() => {
    setCurrent((prev) => {
      if (prev?.onCancel) {
        prev.onCancel();
      }
      return prev;
    });
    restoreFocus();
    advanceQueue();
  }, [restoreFocus, advanceQueue]);

  const handleConfirm = useCallback(() => {
    setCurrent((prev) => {
      if (prev?.onConfirm) {
        prev.onConfirm();
      }
      return prev;
    });
    restoreFocus();
    advanceQueue();
  }, [restoreFocus, advanceQueue]);

  const contextValue: ModalContextValue = { show, dismiss };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {current && current.type === 'confirm' && (
        <ConfirmModal
          titleKey={current.titleKey}
          messageKey={current.messageKey}
          messageParams={current.messageParams}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {current && (current.type === 'info' || current.type === 'error') && (
        <InfoModal
          type={current.type}
          titleKey={current.titleKey}
          messageKey={current.messageKey}
          messageParams={current.messageParams}
          onDismiss={dismiss}
        />
      )}
    </ModalContext.Provider>
  );
};
