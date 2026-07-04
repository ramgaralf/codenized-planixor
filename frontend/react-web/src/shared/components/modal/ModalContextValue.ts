import { createContext } from 'react';

/**
 * Configuration for a modal to be displayed.
 */
export interface ModalConfig {
  type: 'info' | 'error' | 'confirm';
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Context value exposed by the ModalProvider.
 */
export interface ModalContextValue {
  show: (config: ModalConfig) => void;
  dismiss: () => void;
}

export const ModalContext = createContext<ModalContextValue | undefined>(undefined);
