import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useSyncStore } from '@features/sync/stores/syncStore';
import { validateConnection } from '@features/sync/services/syncValidationService';

const ERROR_KEY_MAP: Record<string, string> = {
  url_required: 'sync.validation.urlRequired',
  api_key_required: 'sync.validation.apiKeyRequired',
  network_error: 'sync.errors.networkError',
  invalid_credentials: 'sync.errors.invalidCredentials',
  not_found: 'sync.errors.notFound',
  server_error: 'sync.errors.serverError',
  timeout: 'sync.errors.timeout',
};

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

export const SyncConfigScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saveConfig = useSyncStore((state) => state.saveConfig);
  const existingConfig = useSyncStore((state) => state.config);

  const [serverUrl, setServerUrl] = useState(existingConfig?.serverUrl ?? '');
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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
      const result = await validateConnection(serverUrl.trim(), apiKey.trim());

      if (result.success) {
        await saveConfig({
          serverUrl: serverUrl.trim(),
          apiKey: apiKey.trim(),
          username: result.username ?? '',
          isPaused: false,
          lastSyncedAt: null,
        });
        navigate('/sync');
      } else {
        const i18nKey = ERROR_KEY_MAP[result.error ?? 'server_error'] ?? 'sync.errors.serverError';
        setError(t(i18nKey));
      }
    } finally {
      setIsValidating(false);
    }
  }, [serverUrl, apiKey, saveConfig, navigate, t]);

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
            placeholder="https://backend.planixor.com"
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
    </div>
  );
};
