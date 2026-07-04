import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface PrerequisiteModalProps {
  missingShifts: boolean;
  missingReminders: boolean;
  onDismiss: () => void;
}

/**
 * PrerequisiteModal — informs the user which prerequisites (shifts/reminders)
 * must exist before creating a calendar event.
 *
 * Provides navigation actions to the Shifts and/or Reminders pages,
 * plus a dismiss action that closes and returns to Calendar view.
 *
 * **Validates: Requirements 6.5, 6.6, 6.7**
 */
export const PrerequisiteModal = ({
  missingShifts,
  missingReminders,
  onDismiss,
}: PrerequisiteModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const handleGoToShifts = useCallback(() => {
    onDismiss();
    navigate('/shifts');
  }, [onDismiss, navigate]);

  const handleGoToReminders = useCallback(() => {
    onDismiss();
    navigate('/reminders');
  }, [onDismiss, navigate]);

  const getMessageKey = (): string => {
    if (missingShifts && missingReminders) {
      return 'prerequisite.messageBoth';
    }
    if (missingShifts) {
      return 'prerequisite.messageShifts';
    }
    return 'prerequisite.messageReminders';
  };

  const titleId = 'prerequisite-modal-title';

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
              color: 'var(--color-text-primary)',
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {t('prerequisite.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onDismiss}
            aria-label={t('modal.close')}
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
          {t(getMessageKey())}
        </p>

        <div className="flex flex-col gap-3" style={{ marginTop: '8px' }}>
          <div className="flex gap-3 flex-wrap">
            {missingShifts && (
              <button
                type="button"
                onClick={handleGoToShifts}
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
                {t('prerequisite.goToShifts')}
              </button>
            )}

            {missingReminders && (
              <button
                type="button"
                onClick={handleGoToReminders}
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
                {t('prerequisite.goToReminders')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
