import { useTranslation } from 'react-i18next';

interface RestoreConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

/**
 * RestoreConfirmDialog — confirmation dialog shown during backup restoration
 * when existing data is detected in local storage.
 *
 * Informs the user that merging will occur and provides Cancel / Continue actions.
 * The backdrop does not dismiss on click — the user must choose an action.
 *
 * **Validates: Requirements 7.3, 7.4, 7.5, 7.6**
 */
export const RestoreConfirmDialog = ({
  isOpen,
  onCancel,
  onContinue,
}: RestoreConfirmDialogProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const titleId = 'restore-confirm-dialog-title';
  const messageId = 'restore-confirm-dialog-message';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      role="presentation"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="flex flex-col"
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
            margin: '0 0 12px 0',
          }}
        >
          {t('backup.confirmTitle')}
        </h2>

        <p
          id={messageId}
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
            margin: '0 0 24px 0',
            lineHeight: 1.5,
          }}
        >
          {t('backup.confirmMessage')}
        </p>

        <div className="flex justify-end gap-3">
          <button
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
            {t('backup.confirmCancel')}
          </button>

          <button
            type="button"
            onClick={onContinue}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('backup.confirmContinue')}
          </button>
        </div>
      </div>
    </div>
  );
};
