import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface PropagationModalProps {
  isOpen: boolean;
  templateName: string;
  templateType: 'shift' | 'reminder';
  affectedEventCount: number;
  onConfirm: () => void;
  onDecline: () => void;
}

const PROPAGATION_I18N_KEYS = {
  TITLE: 'propagation.modal.title',
  DESCRIPTION_SHIFT: 'propagation.modal.description.shift',
  DESCRIPTION_REMINDER: 'propagation.modal.description.reminder',
  AFFECTED_COUNT: 'propagation.modal.affectedCount',
  CONFIRM: 'propagation.modal.confirm',
  DECLINE: 'propagation.modal.decline',
} as const;

/**
 * PropagationModal — shared dialog that asks the user whether to propagate
 * template changes (shift or reminder) to affected calendar events for the
 * current year.
 *
 * Displays:
 * - Title
 * - Description with template name and current year (based on templateType)
 * - Affected event count
 * - Confirm and Decline buttons
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true"
 * - aria-labelledby pointing to the title
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Escape key closes (calls onDecline)
 * - Click outside closes (calls onDecline)
 *
 * Requirements: 6.1, 6.2, 7.1, 7.2, 8.3
 */
export const PropagationModal = ({
  isOpen,
  templateName,
  templateType,
  affectedEventCount,
  onConfirm,
  onDecline,
}: PropagationModalProps) => {
  const { t } = useTranslation();
  const declineButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();

  // Focus the decline button when modal opens (safe default)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        declineButtonRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Trap focus within the modal while open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDecline();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

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
  }, [isOpen, onDecline]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onDecline();
      }
    },
    [onDecline],
  );

  if (!isOpen) return null;

  const titleId = 'propagation-modal-title';

  const descriptionKey =
    templateType === 'shift'
      ? PROPAGATION_I18N_KEYS.DESCRIPTION_SHIFT
      : PROPAGATION_I18N_KEYS.DESCRIPTION_REMINDER;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      role="presentation"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleOverlayClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
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
          {t(PROPAGATION_I18N_KEYS.TITLE)}
        </h2>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {t(descriptionKey, { name: templateName, year: currentYear })}
        </p>

        <p
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            margin: 0,
          }}
        >
          {t(PROPAGATION_I18N_KEYS.AFFECTED_COUNT, { count: affectedEventCount })}
        </p>

        <div className="flex justify-end gap-3" style={{ marginTop: '8px' }}>
          <button
            ref={declineButtonRef}
            type="button"
            onClick={onDecline}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t(PROPAGATION_I18N_KEYS.DECLINE)}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t(PROPAGATION_I18N_KEYS.CONFIRM)}
          </button>
        </div>
      </div>
    </div>
  );
};
