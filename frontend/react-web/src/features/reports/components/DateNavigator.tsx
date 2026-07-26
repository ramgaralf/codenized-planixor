import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ReportMode = 'month' | 'year';

interface DateNavigatorProps {
  mode: ReportMode;
  selectedMonth: number;
  selectedYear: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onPreviousYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
}

const NAV_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '50%',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  padding: 0,
};

const MONTH_LABEL_STYLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  textTransform: 'capitalize',
  userSelect: 'none',
  textAlign: 'center',
  minWidth: '100px',
  display: 'inline-block',
};

const YEAR_LABEL_STYLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  userSelect: 'none',
  textAlign: 'center',
  minWidth: '48px',
  display: 'inline-block',
};

export const DateNavigator = ({
  mode,
  selectedMonth,
  selectedYear,
  onPreviousMonth,
  onNextMonth,
  onPreviousYear,
  onNextYear,
  onToday,
}: DateNavigatorProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const monthLabel = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth);
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
  }, [selectedMonth, selectedYear, locale]);

  const yearLabel = String(selectedYear);

  return (
    <nav
      className="flex items-center gap-1 w-full"
      aria-label={t('reports.dateNavigation', { defaultValue: 'Report date navigation' })}
    >
      {mode === 'month' && (
        <NavSegment
          label={monthLabel}
          labelStyle={MONTH_LABEL_STYLE}
          onPrevious={onPreviousMonth}
          onNext={onNextMonth}
          previousLabel={t('accessibility.previousMonth', { defaultValue: 'Previous month' })}
          nextLabel={t('accessibility.nextMonth', { defaultValue: 'Next month' })}
        />
      )}

      <NavSegment
        label={yearLabel}
        labelStyle={YEAR_LABEL_STYLE}
        onPrevious={onPreviousYear}
        onNext={onNextYear}
        previousLabel={t('accessibility.previousYear', { defaultValue: 'Previous year' })}
        nextLabel={t('accessibility.nextYear', { defaultValue: 'Next year' })}
      />

      <button
        type="button"
        onClick={onToday}
        style={{
          marginLeft: 'auto',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          cursor: 'pointer',
        }}
      >
        {t('calendar.today', { defaultValue: 'Today' })}
      </button>
    </nav>
  );
};

interface NavSegmentProps {
  label: string;
  labelStyle: React.CSSProperties;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
}

const NavSegment = ({
  label,
  labelStyle,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
}: NavSegmentProps) => {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onPrevious}
        aria-label={previousLabel}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <span style={labelStyle}>{label}</span>

      <button
        type="button"
        onClick={onNext}
        aria-label={nextLabel}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
};
