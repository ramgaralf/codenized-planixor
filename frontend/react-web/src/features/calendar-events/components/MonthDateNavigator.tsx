import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

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
};

/**
 * MonthDateNavigator — navigation control for Month view.
 *
 * Layout: < MonthName >  < Year >
 */
export const MonthDateNavigator = () => {
  const { t, i18n } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const navigateMonth = useCalendarStore((state) => state.navigateMonth);
  const navigateYear = useCalendarStore((state) => state.navigateYear);

  const locale = i18n.language;

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(currentDate);
  }, [currentDate, locale]);

  const year = currentDate.getFullYear();

  return (
    <nav
      className="flex items-center gap-1 flex-wrap justify-center"
      aria-label={t('accessibility.calendarNavigation', { defaultValue: 'Calendar navigation' })}
    >
      {/* Month name with controls */}
      <button
        type="button"
        onClick={() => navigateMonth(-1)}
        aria-label={t('accessibility.previousMonth', { defaultValue: 'Previous month' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span style={LABEL_STYLE}>
        {monthName}
      </span>
      <button
        type="button"
        onClick={() => navigateMonth(1)}
        aria-label={t('accessibility.nextMonth', { defaultValue: 'Next month' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {/* Year with controls */}
      <button
        type="button"
        onClick={() => navigateYear(-1)}
        aria-label={t('accessibility.previousYear', { defaultValue: 'Previous year' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span style={LABEL_STYLE}>
        {year}
      </span>
      <button
        type="button"
        onClick={() => navigateYear(1)}
        aria-label={t('accessibility.nextYear', { defaultValue: 'Next year' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
};
