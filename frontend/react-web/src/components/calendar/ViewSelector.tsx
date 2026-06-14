import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';
import type { CalendarView } from '@/stores/calendarStore';

import styles from './ViewSelector.module.css';

const VIEW_OPTIONS: CalendarView[] = ['day', 'week', 'month', 'year'];

const VIEW_LABEL_KEYS: Record<CalendarView, string> = {
  day: 'views.day',
  week: 'views.week',
  month: 'views.month',
  year: 'views.year',
};

export const ViewSelector = () => {
  const { t } = useTranslation();
  const activeView = useCalendarStore((state) => state.activeView);
  const setView = useCalendarStore((state) => state.setView);

  return (
    <div
      className={styles.viewSelector}
      role="tablist"
      aria-label={t('accessibility.calendarNavigation')}
    >
      {VIEW_OPTIONS.map((view) => (
        <button
          key={view}
          role="tab"
          aria-selected={activeView === view}
          className={`${styles.tab} ${activeView === view ? styles.tabActive : ''}`}
          onClick={() => setView(view)}
        >
          {t(VIEW_LABEL_KEYS[view])}
        </button>
      ))}
    </div>
  );
};
