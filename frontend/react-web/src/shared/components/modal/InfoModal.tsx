import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface InfoModalProps {
  type: 'info' | 'error';
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  onDismiss: () => void;
}

const CLOSE_LABEL_KEY = 'modal.close';

/**
 * InfoModal — modal for informational and error messages.
 *
 * Dismiss via:
 * - Close button (X)
 * - Overlay click
 * - Escape key
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true"
 * - aria-labelledby for title
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Focus returns to trigger on dismiss (handled by ModalProvider)
 *
 * **Validates: Requirements 10.2, 10.3, 10.5, 10.6**
 */
export const InfoModal = ({
  type,
  titleKey,
  messageKey,
  messageParams,
  onDismiss,
}: InfoModalProps) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key and focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
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
  }, [onDismiss]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  const titleId = 'info-modal-title';
  const titleColor = type === 'error' ? 'var(--color-error)' : 'var(--color-text-primary)';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      role="presentation"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
          position: 'relative',
        }}
      >
        <div className="flex items-start justify-between">
          <h2
            id={titleId}
            style={{
              color: titleColor,
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {t(titleKey)}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onDismiss}
            aria-label={t(CLOSE_LABEL_KEY)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {t(messageKey, messageParams)}
        </p>
      </div>
    </div>
  );
};
