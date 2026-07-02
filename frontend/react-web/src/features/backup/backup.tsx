import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useBackup } from './hooks/useBackup';
import type { BackupNotification } from './hooks/useBackup';
import { RestoreConfirmDialog } from './components/RestoreConfirmDialog';

const NOTIFICATION_AUTO_DISMISS_MS = 5000;

const getNotificationBackgroundColor = (type: BackupNotification['type']): string => {
  switch (type) {
    case 'success':
      return 'rgba(16, 185, 129, 0.12)';
    case 'error':
      return 'rgba(239, 68, 68, 0.12)';
    case 'info':
      return 'rgba(37, 99, 235, 0.12)';
  }
};

const getNotificationTextColor = (type: BackupNotification['type']): string => {
  switch (type) {
    case 'success':
      return 'var(--color-success)';
    case 'error':
      return 'var(--color-error)';
    case 'info':
      return 'var(--color-primary)';
  }
};

/**
 * Backup — container component rendering the Backup section for the Settings page.
 *
 * Provides "Create" and "Restore" buttons, handles loading states, concurrency guards,
 * and renders the confirmation dialog when existing data is detected during restore.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6**
 */
export const Backup = () => {
  const { t } = useTranslation();
  const {
    isCreating,
    isRestoring,
    showConfirmDialog,
    notification,
    handleCreate,
    handleRestore,
    handleConfirmRestore,
    handleCancelRestore,
    dismissNotification,
  } = useBackup();

  const isBusy = isCreating || isRestoring;

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      dismissNotification();
    }, NOTIFICATION_AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  return (
    <>
      <section
        style={{
          padding: '16px 0',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '12px',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {t('backup.sectionTitle')}
        </h3>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isBusy}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-family)',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.5 : 1,
            }}
          >
            {isCreating ? '...' : t('backup.create')}
          </button>

          <button
            type="button"
            onClick={handleRestore}
            disabled={isBusy}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-primary)',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-family)',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.5 : 1,
            }}
          >
            {isRestoring ? '...' : t('backup.restore')}
          </button>
        </div>

        {notification && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-family)',
              backgroundColor: getNotificationBackgroundColor(notification.type),
              color: getNotificationTextColor(notification.type),
            }}
          >
            {t(notification.messageKey, notification.params ?? {})}
          </div>
        )}
      </section>

      <RestoreConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={handleCancelRestore}
        onContinue={handleConfirmRestore}
      />
    </>
  );
};
