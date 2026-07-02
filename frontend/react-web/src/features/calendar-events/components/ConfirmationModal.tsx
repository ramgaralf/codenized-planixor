import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { softDelete } from '../services/calendarEventService';
import { CALENDAR_EVENT_I18N_KEYS } from '../constants';

interface ConfirmationModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Event name to display in the confirmation message */
  eventName: string;
  /** Event ID to delete */
  eventId: string;
  /** Called after successful deletion */
  onConfirm: () => void;
  /** Called when modal is dismissed without deleting */
  onDismiss: () => void;
}

/**
 * ConfirmationModal — delete confirmation dialog for calendar events.
 *
 * Shows a modal overlay with event name and permanent deletion message.
 * On confirm: calls softDelete, dismisses modal, notifies parent via onConfirm.
 * On dismiss (cancel, outside click, escape): closes modal, no changes to record.
 * On storage failure: dismisses modal, parent handles error display via onDismiss.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 */
export const ConfirmationModal = ({
  isOpen,
  eventName,
  eventId,
  onConfirm,
  onDismiss,
}: ConfirmationModalProps) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the cancel button when modal opens (safest default)
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is painted before focusing
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
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
        onDismiss();
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
  }, [isOpen, onDismiss]);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await softDelete(eventId);
      onConfirm();
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      onDismiss();
    } finally {
      setIsDeleting(false);
    }
  }, [eventId, onConfirm, onDismiss]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  if (!isOpen) return null;

  const titleId = 'confirmation-modal-title';
  const messageId = 'confirmation-modal-message';

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
        aria-describedby={messageId}
        className="flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
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
          {t(CALENDAR_EVENT_I18N_KEYS.DELETE_TITLE, { name: eventName })}
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
          {t(CALENDAR_EVENT_I18N_KEYS.DELETE_MESSAGE)}
        </p>

        <div className="flex justify-end gap-3" style={{ marginTop: '8px' }}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onDismiss}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {t(CALENDAR_EVENT_I18N_KEYS.DELETE_CANCEL)}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-error)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting
              ? '...'
              : t(CALENDAR_EVENT_I18N_KEYS.DELETE_CONFIRM)}
          </button>
        </div>
      </div>
    </div>
  );
};
