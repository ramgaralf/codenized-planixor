import { useTranslation } from 'react-i18next';

import { ALERT_OFFSETS } from '../types';
import type { AlertOffset } from '../types';

interface AlertConfigFieldProps {
  /** Currently selected alert offsets */
  alertOffsets: number[];
  /** Callback when selection changes */
  onChange: (offsets: number[]) => void;
  /** Whether the field should be visible (event start is in the future) */
  visible: boolean;
}

/**
 * i18n keys for alert offset labels, keyed by offset value.
 */
const ALERT_OFFSET_I18N_KEYS: Record<AlertOffset, string> = {
  0: 'notifications.alertConfig.atStartTime',
  10: 'notifications.alertConfig.tenMinutesBefore',
  60: 'notifications.alertConfig.oneHourBefore',
  1440: 'notifications.alertConfig.oneDayBefore',
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
};

const chipContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const getChipStyle = (isSelected: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: 500,
  borderRadius: '16px',
  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
  color: isSelected ? '#ffffff' : 'var(--color-text-primary)',
  cursor: 'pointer',
  transition: 'all 0.2s',
  userSelect: 'none' as const,
});

/**
 * AlertConfigField — multi-select chip group for configuring notification alert offsets.
 *
 * Displays 4 chip options representing alert timing (at start, 10 min, 1 hour, 1 day before).
 * Only renders when the event start time is strictly in the future.
 * Persists selection to the `alertOffsets` array on the calendar event record.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.7, 11.1**
 */
export const AlertConfigField = ({ alertOffsets, onChange, visible }: AlertConfigFieldProps) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  const handleToggle = (offset: AlertOffset) => {
    const isSelected = alertOffsets.includes(offset);
    if (isSelected) {
      onChange(alertOffsets.filter((o) => o !== offset));
    } else {
      onChange([...alertOffsets, offset]);
    }
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>{t('notifications.alertConfig.label')}</label>
      <div style={chipContainerStyle} role="group" aria-label={t('notifications.alertConfig.label')}>
        {ALERT_OFFSETS.map((offset) => {
          const isSelected = alertOffsets.includes(offset);
          return (
            <button
              key={offset}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => handleToggle(offset)}
              style={getChipStyle(isSelected)}
            >
              {t(ALERT_OFFSET_I18N_KEYS[offset])}
            </button>
          );
        })}
      </div>
    </div>
  );
};
