import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        onCancel();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      style={{
        position: 'fixed',
        inset: 0,
        margin: 'auto',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '16px',
        border: 'none',
        padding: '24px',
        backgroundColor: 'var(--color-surface)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)',
        color: 'var(--color-text-primary)',
      }}
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
      onCancel={handleCancel}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2
          id="confirmation-modal-title"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          id="confirmation-modal-message"
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
