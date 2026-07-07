import { useTranslation } from 'react-i18next';

import type { SeriesFrequency } from '@features/reminders/services/reminderValidation';

interface FrequencySelectorProps {
  value: SeriesFrequency;
  onChange: (value: SeriesFrequency) => void;
  disabled?: boolean;
}

const FREQUENCY_OPTIONS: SeriesFrequency[] = ['never', 'weekly', 'monthly', 'yearly'];

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid var(--color-border)',
};

const getButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  flex: '1 1 auto',
  minWidth: '0',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: isSelected ? 600 : 400,
  border: 'none',
  borderRight: '1px solid var(--color-border)',
  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
  color: isSelected ? '#ffffff' : 'var(--color-text-primary)',
  cursor: 'pointer',
  transition: 'background-color 0.15s, color 0.15s',
  whiteSpace: 'nowrap',
});

export const FrequencySelector = ({
  value,
  onChange,
  disabled = false,
}: FrequencySelectorProps) => {
  const { t } = useTranslation();

  const getLabel = (frequency: SeriesFrequency): string => {
    switch (frequency) {
      case 'never':
        return t('reminder.form.frequency.never');
      case 'weekly':
        return t('reminder.form.frequency.weekly');
      case 'monthly':
        return t('reminder.form.frequency.monthly');
      case 'yearly':
        return t('reminder.form.frequency.yearly');
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('reminder.form.frequency.label')}
      style={containerStyle}
    >
      {FREQUENCY_OPTIONS.map((option, index) => {
        const isSelected = value === option;
        const isLast = index === FREQUENCY_OPTIONS.length - 1;
        const style = {
          ...getButtonStyle(isSelected),
          ...(isLast ? { borderRight: 'none' } : {}),
          ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        };

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option)}
            style={style}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
};
