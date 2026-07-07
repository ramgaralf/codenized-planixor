import { useTranslation } from 'react-i18next';

interface SeriesActionDialogProps {
  isOpen: boolean;
  action: 'edit' | 'delete';
  onThisEvent: () => void;
  onAllInSeries: () => void;
  onCancel: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
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
  maxWidth: '400px',
  width: '90%',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: '0 0 12px 0',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  margin: '0 0 24px 0',
  lineHeight: 1.5,
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  textAlign: 'left',
};

const cancelButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  textAlign: 'center',
  marginTop: '8px',
  color: 'var(--color-text-secondary)',
};

export const SeriesActionDialog = ({
  isOpen,
  action,
  onThisEvent,
  onAllInSeries,
  onCancel,
}: SeriesActionDialogProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const titleKey = action === 'edit'
    ? 'calendarEvent.series.editTitle'
    : 'calendarEvent.series.deleteTitle';

  const descriptionKey = action === 'edit'
    ? 'calendarEvent.series.editDescription'
    : 'calendarEvent.series.deleteDescription';

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="series-dialog-title">
      <div style={dialogStyle}>
        <h3 id="series-dialog-title" style={titleStyle}>
          {t(titleKey)}
        </h3>
        <p style={descriptionStyle}>
          {t(descriptionKey)}
        </p>
        <div style={buttonGroupStyle}>
          <button
            type="button"
            onClick={onThisEvent}
            style={buttonStyle}
          >
            {t('calendarEvent.series.onlyThisEvent')}
          </button>
          <button
            type="button"
            onClick={onAllInSeries}
            style={buttonStyle}
          >
            {t('calendarEvent.series.allInSeries')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={cancelButtonStyle}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
