import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
}

const I18N_KEYS = {
  CONFIRM: 'common.confirm',
  CANCEL: 'common.cancel',
} as const;

/**
 * ConfirmModal — modal for confirmation actions requiring explicit user decision.
 *
 * Dismiss ONLY via explicit buttons (confirm or cancel).
 * Does NOT dismiss on overlay click or Escape key.
 *
 * Accessibility:
 * - role="alertdialog" + aria-modal="true"
 * - aria-labelledby for title, aria-describedby for message
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Focus returns to trigger on dismiss (handled by ModalProvider)
 *
 * **Validates: Requirements 10.2, 10.4, 10.5, 10.6**
 */
export const ConfirmModal = ({
  titleKey,
  messageKey,
  messageParams,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on mount (safe default for destructive actions)
  useEffect(() => {
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Focus trap only — no Escape dismiss for confirm modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Escape — confirm modals only dismiss via buttons
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement | undefined;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const titleId = 'confirm-modal-title';
  const messageId = 'confirm-modal-message';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      role="presentation"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h2
          id={titleId}
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
          }}
        >
          {t(titleKey)}
        </h2>

        <p
          id={messageId}
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {t(messageKey, messageParams)}
        </p>

        <div className="flex justify-end gap-3" style={{ marginTop: '8px' }}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t(I18N_KEYS.CANCEL)}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t(I18N_KEYS.CONFIRM)}
          </button>
        </div>
      </div>
    </div>
  );
};
