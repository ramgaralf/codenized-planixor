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
  minWidth: '24px',
  display: 'inline-block',
};

/**
 * DayDateNavigator — compact navigation control for Day view.
 *
 * Layout: DayName  < DayNumber >  < MonthName >  < Year >
 *
 * Each segment (day, month, year) has its own prev/next chevrons.
 * On mobile (<768px), uses short day/month names.
 */
export const DayDateNavigator = () => {
  const { t, i18n } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const navigateDay = useCalendarStore((state) => state.navigateDay);
  const navigateMonth = useCalendarStore((state) => state.navigateMonth);
  const navigateYear = useCalendarStore((state) => state.navigateYear);
  const goToToday = useCalendarStore((state) => state.goToToday);

  const locale = i18n.language;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const dayName = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { weekday: isMobile ? 'short' : 'long' }).format(currentDate);
  }, [currentDate, locale, isMobile]);

  const dayNumber = currentDate.getDate();

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { month: isMobile ? 'short' : 'long' }).format(currentDate);
  }, [currentDate, locale, isMobile]);

  const year = currentDate.getFullYear();

  return (
    <nav
      className="flex items-center gap-1 w-full"
      aria-label={t('accessibility.calendarNavigation', { defaultValue: 'Calendar navigation' })}
    >
      {/* Day name (no controls) */}
      <span style={{ ...LABEL_STYLE, minWidth: '40px', marginRight: '4px' }}>
        {dayName}
      </span>

      {/* Day number with controls */}
      <button
        type="button"
        onClick={() => navigateDay(-1)}
        aria-label={t('accessibility.previousDay', { defaultValue: 'Previous day' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span style={{ ...LABEL_STYLE, minWidth: '24px' }}>
        {dayNumber}
      </span>
      <button
        type="button"
        onClick={() => navigateDay(1)}
        aria-label={t('accessibility.nextDay', { defaultValue: 'Next day' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {/* Month name with controls */}
      <button
        type="button"
        onClick={() => navigateMonth(-1)}
        aria-label={t('accessibility.previousMonth', { defaultValue: 'Previous month' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span style={{ ...LABEL_STYLE, minWidth: '48px' }}>
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
      <span style={{ ...LABEL_STYLE, minWidth: '40px' }}>
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

      {/* Today button */}
      <button
        type="button"
        onClick={goToToday}
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
        {t('calendar.today', { defaultValue: 'Hoy' })}
      </button>
    </nav>
  );
};
