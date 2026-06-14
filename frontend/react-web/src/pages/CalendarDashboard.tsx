import { useCalendarStore } from '@/stores/calendarStore';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { ViewSelector } from '@/components/calendar/ViewSelector';
import { DateNavigator } from '@/components/calendar/DateNavigator';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { YearView } from '@/components/calendar/YearView';

import type { CalendarView } from '@/stores/calendarStore';

import styles from './CalendarDashboard.module.css';

const CALENDAR_VIEWS: Record<CalendarView, React.FC> = {
  day: DayView,
  week: WeekView,
  month: MonthView,
  year: YearView,
};

export const CalendarDashboard = () => {
  const activeView = useCalendarStore((state) => state.activeView);
  const ActiveViewComponent = CALENDAR_VIEWS[activeView];

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <HeaderBar />
        <div className={styles.controls}>
          <ViewSelector />
          <DateNavigator />
        </div>
      </div>
      <div className={styles.calendarContent}>
        <ActiveViewComponent />
      </div>
    </div>
  );
};
