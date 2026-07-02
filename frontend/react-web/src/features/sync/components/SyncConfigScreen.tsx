import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { db } from '@/data/db';
import { useSyncStore } from '@features/sync/stores/syncStore';
import { validateConnection } from '@features/sync/services/syncValidationService';
import {
  normalizeApiBasePath,
  parseServerUrl,
  buildFullServerUrl,
} from '@features/sync/services/apiBasePathUtils';

import type { SyncConfig } from '@features/sync/models';

const ERROR_KEY_MAP: Record<string, string> = {
  url_required: 'sync.validation.urlRequired',
  api_key_required: 'sync.validation.apiKeyRequired',
  network_error: 'sync.errors.networkError',
  invalid_credentials: 'sync.errors.invalidCredentials',
  not_found: 'sync.errors.notFound',
  server_error: 'sync.errors.serverError',
  timeout: 'sync.errors.timeout',
};

const SYNC_INTERVAL_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

const pageStyle: React.CSSProperties = {
  padding: '24px 32px',
  maxWidth: '600px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '32px',
};

const backButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  minWidth: '44px',
  minHeight: '44px',
  border: 'none',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  margin: 0,
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '24px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '14px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const errorMessageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-error)',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-error)',
  marginBottom: '24px',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '8px',
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const validateButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: '#FFFFFF',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
};

const validateButtonDisabledStyle: React.CSSProperties = {
  ...validateButtonStyle,
  opacity: 0.6,
  cursor: 'not-allowed',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '14px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: '16px',
  padding: '24px',
  maxWidth: '480px',
  width: '90%',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
};

const dialogTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: '16px',
};

const dialogMessageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  marginBottom: '16px',
  lineHeight: 1.5,
};

const dialogCategoryLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  marginBottom: '8px',
};

const dialogCategoryListStyle: React.CSSProperties = {
  listStyleType: 'disc',
  paddingLeft: '20px',
  marginBottom: '24px',
};

const dialogCategoryItemStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-secondary)',
  marginBottom: '4px',
};

const dialogActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
};

const dialogCancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: '2px solid var(--color-primary)',
  backgroundColor: 'var(--color-primary)',
  color: '#FFFFFF',
  cursor: 'pointer',
};

const dialogConfirmButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: '1px solid var(--color-error)',
  backgroundColor: 'transparent',
  color: 'var(--color-error)',
  cursor: 'pointer',
};

interface PendingConfig {
  config: SyncConfig;
  previousUsername: string;
  newUsername: string;
}

/**
 * Deletes all local syncable data from IndexedDB.
 * Returns true on success, false if any deletion fails.
 */
const deleteAllSyncableData = async (): Promise<boolean> => {
  try {
    await db.calendarEvents.clear();
    await db.shifts.clear();
    await db.reminders.clear();
    await db.notifications.clear();
    await db.annualHoursConfig.clear();
    return true;
  } catch (err) {
    console.error('Failed to delete syncable data:', err);
    return false;
  }
};

export const SyncConfigScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saveConfig = useSyncStore((state) => state.saveConfig);
  const existingConfig = useSyncStore((state) => state.config);

  const [serverUrl, setServerUrl] = useState(
    existingConfig
      ? buildFullServerUrl(existingConfig.serverUrl, existingConfig.apiBasePath)
      : '',
  );
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey ?? '');
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(
    existingConfig?.syncIntervalMinutes ?? 5,
  );
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<PendingConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const saveAndNavigate = useCallback(
    async (config: SyncConfig) => {
      await saveConfig(config);
      navigate('/sync');
    },
    [saveConfig, navigate],
  );

  const handleValidate = useCallback(async () => {
    setError(null);

    if (!serverUrl.trim()) {
      setError(t('sync.validation.urlRequired'));
      return;
    }

    if (!apiKey.trim()) {
      setError(t('sync.validation.apiKeyRequired'));
      return;
    }

    setIsValidating(true);

    try {
      const { origin, path } = parseServerUrl(serverUrl);
      const normalizedBasePath = normalizeApiBasePath(path);
      const result = await validateConnection(
        origin,
        apiKey.trim(),
        normalizedBasePath,
      );

      if (result.success) {
        const newUsername = result.username ?? '';
        const newConfig: SyncConfig = {
          serverUrl: origin,
          apiKey: apiKey.trim(),
          apiBasePath: normalizedBasePath,
          syncIntervalMinutes,
          username: newUsername,
          isPaused: false,
          lastSyncedAt: null,
        };

        const isFirstTimeConfig = !existingConfig;
        const sameUsername = existingConfig?.username === newUsername;

        if (isFirstTimeConfig || sameUsername) {
          await saveAndNavigate(newConfig);
        } else {
          setPendingConfig({
            config: newConfig,
            previousUsername: existingConfig.username,
            newUsername,
          });
        }
      } else {
        const i18nKey = ERROR_KEY_MAP[result.error ?? 'server_error'] ?? 'sync.errors.serverError';
        setError(t(i18nKey));
      }
    } finally {
      setIsValidating(false);
    }
  }, [serverUrl, apiKey, syncIntervalMinutes, existingConfig, saveAndNavigate, t]);

  const handleConfirmUsernameChange = useCallback(async () => {
    if (!pendingConfig) return;

    setIsDeleting(true);
    setError(null);

    const success = await deleteAllSyncableData();

    if (success) {
      await saveAndNavigate(pendingConfig.config);
      setPendingConfig(null);
    } else {
      setError(t('sync.usernameChange.dataResetFailed'));
      setPendingConfig(null);
    }

    setIsDeleting(false);
  }, [pendingConfig, saveAndNavigate, t]);

  const handleCancelUsernameChange = useCallback(() => {
    setPendingConfig(null);
  }, []);

  const handleCancel = useCallback(() => {
    setServerUrl('');
    setApiKey('');
    navigate(-1);
  }, [navigate]);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleValidate();
    },
    [handleValidate],
  );

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common.cancel')}
          style={backButtonStyle}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 style={titleStyle}>{t('sync.configTitle')}</h1>
      </header>

      <form onSubmit={handleFormSubmit} noValidate>
        <div style={fieldGroupStyle}>
          <label htmlFor="sync-server-url" style={labelStyle}>
            {t('sync.serverUrl')}
          </label>
          <input
            id="sync-server-url"
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://backend.planixor.com/api"
            style={inputStyle}
            autoComplete="url"
          />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="sync-api-key" style={labelStyle}>
            {t('sync.apiKey')}
          </label>
          <input
            id="sync-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
          />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="sync-interval" style={labelStyle}>
            {t('sync.config.syncInterval')}
          </label>
          <select
            id="sync-interval"
            value={syncIntervalMinutes}
            onChange={(e) => setSyncIntervalMinutes(Number(e.target.value))}
            style={selectStyle}
          >
            {SYNC_INTERVAL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} {t('sync.config.syncIntervalUnit')}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div role="alert" style={errorMessageStyle}>
            {error}
          </div>
        )}

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={handleCancel}
            style={cancelButtonStyle}
          >
            {t('sync.actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={isValidating}
            style={isValidating ? validateButtonDisabledStyle : validateButtonStyle}
          >
            {isValidating ? t('common.loading') : t('sync.actions.validate')}
          </button>
        </div>
      </form>

      {pendingConfig && (
        <div
          style={overlayStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="username-change-title"
        >
          <div style={dialogStyle}>
            <h2 id="username-change-title" style={dialogTitleStyle}>
              {t('sync.usernameChange.title')}
            </h2>
            <p style={dialogMessageStyle}>
              {t('sync.usernameChange.message', {
                previousUsername: pendingConfig.previousUsername,
                newUsername: pendingConfig.newUsername,
              })}
            </p>
            <p style={dialogCategoryLabelStyle}>
              {t('sync.usernameChange.dataCategories')}
            </p>
            <ul style={dialogCategoryListStyle}>
              <li style={dialogCategoryItemStyle}>
                {t('sync.usernameChange.categoryCalendarEvents')}
              </li>
              <li style={dialogCategoryItemStyle}>
                {t('sync.usernameChange.categoryShifts')}
              </li>
              <li style={dialogCategoryItemStyle}>
                {t('sync.usernameChange.categoryReminders')}
              </li>
              <li style={dialogCategoryItemStyle}>
                {t('sync.usernameChange.categoryNotificationRecords')}
              </li>
              <li style={dialogCategoryItemStyle}>
                {t('sync.usernameChange.categoryAnnualHoursConfig')}
              </li>
            </ul>
            <div style={dialogActionsStyle}>
              <button
                type="button"
                onClick={handleConfirmUsernameChange}
                disabled={isDeleting}
                style={dialogConfirmButtonStyle}
              >
                {isDeleting ? t('common.loading') : t('sync.usernameChange.confirm')}
              </button>
              <button
                type="button"
                onClick={handleCancelUsernameChange}
                disabled={isDeleting}
                style={dialogCancelButtonStyle}
              >
                {t('sync.usernameChange.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
