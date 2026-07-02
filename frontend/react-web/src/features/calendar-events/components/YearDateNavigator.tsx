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
  userSelect: 'none',
  textAlign: 'center',
  minWidth: '40px',
  display: 'inline-block',
};

/**
 * YearDateNavigator — navigation control for Year view.
 *
 * Layout: < Year >
 */
export const YearDateNavigator = () => {
  const { t } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const navigateYear = useCalendarStore((state) => state.navigateYear);
  const goToToday = useCalendarStore((state) => state.goToToday);

  const year = currentDate.getFullYear();

  return (
    <nav
      className="flex items-center gap-1 w-full"
      aria-label={t('accessibility.calendarNavigation', { defaultValue: 'Calendar navigation' })}
    >
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
