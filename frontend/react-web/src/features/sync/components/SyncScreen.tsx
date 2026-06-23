import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useSyncStore } from '@features/sync/stores/syncStore';
import type { ConnectionStatus } from '@features/sync/models';

const STATUS_DOT_COLORS: Record<ConnectionStatus, string> = {
  active: 'var(--color-success)',
  failing: 'var(--color-error)',
  paused: 'var(--color-text-secondary)',
  unconfigured: 'var(--color-text-secondary)',
};

const maskApiKey = (key: string): string => {
  if (key.length <= 7) {
    return '\u2022'.repeat(key.length || 6);
  }
  return key.slice(0, 3) + '\u2022'.repeat(6) + key.slice(-4);
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

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '24px',
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '24px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
};

const valueStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 400,
  color: 'var(--color-text-primary)',
};

const statusLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
};

const statusValueStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
};

const actionButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: '#FFFFFF',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
  marginBottom: '12px',
};

const secondaryButtonStyle: React.CSSProperties = {
  width: '100%',
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

export const SyncScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const config = useSyncStore((state) => state.config);
  const connectionStatus = useSyncStore((state) => state.connectionStatus);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const pause = useSyncStore((state) => state.pause);
  const resume = useSyncStore((state) => state.resume);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handlePause = useCallback(() => {
    pause();
  }, [pause]);

  const handleResume = useCallback(() => {
    resume();
  }, [resume]);

  const handleConfiguration = useCallback(() => {
    navigate('/sync/config');
  }, [navigate]);

  const formatLastSynced = (timestamp: string | null): string => {
    if (!timestamp) return t('sync.never');
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(timestamp));
    } catch {
      return timestamp;
    }
  };

  const showPauseButton = connectionStatus === 'active' || connectionStatus === 'failing';
  const showResumeButton = connectionStatus === 'paused';

  const dotStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: STATUS_DOT_COLORS[connectionStatus],
    flexShrink: 0,
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button
          type="button"
          onClick={handleBack}
          aria-label={t('common.cancel')}
          style={backButtonStyle}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 style={titleStyle}>{t('sync.title')}</h1>
      </header>

      <div style={statusRowStyle}>
        <span style={statusLabelStyle}>Status:</span>
        <span style={dotStyle} aria-hidden="true" />
        <span style={statusValueStyle}>{t(`sync.status.${connectionStatus}`)}</span>
      </div>

      <div style={fieldGroupStyle}>
        <span style={labelStyle}>{t('sync.serverUrl')}</span>
        <span style={valueStyle}>{config?.serverUrl ?? ''}</span>
      </div>

      <div style={fieldGroupStyle}>
        <span style={labelStyle}>{t('sync.apiKey')}</span>
        <span style={valueStyle}>{config ? maskApiKey(config.apiKey) : ''}</span>
      </div>

      <div style={fieldGroupStyle}>
        <span style={labelStyle}>{t('sync.username')}</span>
        <span style={valueStyle}>{config?.username ?? ''}</span>
      </div>

      <div style={fieldGroupStyle}>
        <span style={labelStyle}>{t('sync.lastSynced')}</span>
        <span style={valueStyle}>{formatLastSynced(lastSyncedAt)}</span>
      </div>

      {showPauseButton && (
        <button type="button" onClick={handlePause} style={actionButtonStyle}>
          {t('sync.actions.pause')}
        </button>
      )}

      {showResumeButton && (
        <button type="button" onClick={handleResume} style={actionButtonStyle}>
          {t('sync.actions.resume')}
        </button>
      )}

      <button type="button" onClick={handleConfiguration} style={secondaryButtonStyle}>
        {t('sync.actions.configuration')}
      </button>
    </div>
  );
};
