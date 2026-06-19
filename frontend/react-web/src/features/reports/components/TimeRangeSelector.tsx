import { useTranslation } from 'react-i18next';

type ReportMode = 'month' | 'year';

interface TimeRangeSelectorProps {
  mode: ReportMode;
  onModeChange: (mode: ReportMode) => void;
}

const MODES: ReportMode[] = ['month', 'year'];

const MODE_LABEL_KEYS: Record<ReportMode, string> = {
  month: 'views.month',
  year: 'views.year',
};

export const TimeRangeSelector = ({ mode, onModeChange }: TimeRangeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t('reports.timeRangeSelector', { defaultValue: 'Time range selector' })}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '4px',
        padding: '4px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
      }}
    >
      {MODES.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: mode === m ? 'var(--color-primary)' : 'transparent',
            color: mode === m ? '#ffffff' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-family)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
          onClick={() => onModeChange(m)}
        >
          {t(MODE_LABEL_KEYS[m])}
        </button>
      ))}
    </div>
  );
};
