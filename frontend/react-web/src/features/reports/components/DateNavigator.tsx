import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ReportMode = 'month' | 'year';

interface DateNavigatorProps {
  mode: ReportMode;
  selectedMonth: number;
  selectedYear: number;
  onPrevious: () => void;
  onNext: () => void;
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

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  textTransform: 'capitalize',
  userSelect: 'none',
  textAlign: 'center',
  minWidth: '24px',
  display: 'inline-block',
};

export const DateNavigator = ({
  mode,
  selectedMonth,
  selectedYear,
  onPrevious,
  onNext,
  onToday,
}: DateNavigatorProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const label = useMemo(() => {
    if (mode === 'year') {
      return String(selectedYear);
    }
    const date = new Date(selectedYear, selectedMonth);
    const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
    return `${monthName} ${selectedYear}`;
  }, [mode, selectedMonth, selectedYear, locale]);

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 10;
  const maxYear = currentYear + 10;

  const isPreviousDisabled = useMemo(() => {
    if (mode === 'year') {
      return selectedYear <= minYear;
    }
    return selectedYear === minYear && selectedMonth === 0;
  }, [mode, selectedYear, selectedMonth, minYear]);

  const isNextDisabled = useMemo(() => {
    if (mode === 'year') {
      return selectedYear >= maxYear;
    }
    return selectedYear === maxYear && selectedMonth === 11;
  }, [mode, selectedYear, selectedMonth, maxYear]);

  const previousLabel =
    mode === 'month'
      ? t('accessibility.previousMonth', { defaultValue: 'Previous month' })
      : t('accessibility.previousYear', { defaultValue: 'Previous year' });

  const nextLabel =
    mode === 'month'
      ? t('accessibility.nextMonth', { defaultValue: 'Next month' })
      : t('accessibility.nextYear', { defaultValue: 'Next year' });

  return (
    <nav
      className="flex items-center gap-1 w-full"
      aria-label={t('reports.dateNavigation', { defaultValue: 'Report date navigation' })}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={isPreviousDisabled}
        aria-label={previousLabel}
        style={{
          ...NAV_BUTTON_STYLE,
          opacity: isPreviousDisabled ? 0.4 : 1,
          cursor: isPreviousDisabled ? 'default' : 'pointer',
        }}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <span style={{ ...LABEL_STYLE, minWidth: mode === 'month' ? '140px' : '48px' }}>
        {label}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled}
        aria-label={nextLabel}
        style={{
          ...NAV_BUTTON_STYLE,
          opacity: isNextDisabled ? 0.4 : 1,
          cursor: isNextDisabled ? 'default' : 'pointer',
        }}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

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
