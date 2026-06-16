import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

/**
 * DayNavigator — ±1 day navigation control for Day view.
 *
 * **Validates: Requirements 3.3**
 */
export const DayNavigator = () => {
  const { t } = useTranslation();
  const navigateDay = useCalendarStore((state) => state.navigateDay);

  return (
    <nav
      className="flex items-center gap-1"
      aria-label={t('accessibility.dayNavigation', { defaultValue: 'Day navigation' })}
    >
      <button
        type="button"
        onClick={() => navigateDay(-1)}
        aria-label={t('accessibility.previousDay', { defaultValue: 'Previous day' })}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => navigateDay(1)}
        aria-label={t('accessibility.nextDay', { defaultValue: 'Next day' })}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
};
