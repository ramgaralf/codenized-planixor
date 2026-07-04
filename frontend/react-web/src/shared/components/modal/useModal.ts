import { useContext } from 'react';

import { ModalContext } from './ModalContextValue';
import type { ModalContextValue } from './ModalContextValue';

/**
 * Hook to access the modal system.
 *
 * Returns `show(config)` to trigger a modal and `dismiss()` to close the current one.
 * Must be used within a `ModalProvider`.
 *
 * **Validates: Requirements 10.1, 10.2**
 */
export const useModal = (): ModalContextValue => {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  return context;
};
