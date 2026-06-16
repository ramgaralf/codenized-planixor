import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';
import type { CalendarView } from '@/stores/calendarStore';

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
      className="view-selector w-full md:w-auto"
      role="tablist"
      aria-label={t('accessibility.calendarNavigation')}
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
      {VIEW_OPTIONS.map((view) => (
        <button
          key={view}
          role="tab"
          aria-selected={activeView === view}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: activeView === view ? 'var(--color-primary)' : 'transparent',
            color: activeView === view ? '#ffffff' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-family)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
          onClick={() => setView(view)}
        >
          {t(VIEW_LABEL_KEYS[view])}
        </button>
      ))}
    </div>
  );
};
