import { useCalendarStore } from '@/stores/calendarStore';
import { CalendarEvents } from '@features/calendar-events/calendar-events';

export const CalendarDashboard = () => {
  const showCreateForm = useCalendarStore((state) => state.showCreateForm);
  const closeCreateForm = useCalendarStore((state) => state.closeCreateForm);

  return (
    <CalendarEvents
      showCreateForm={showCreateForm}
      onCreateFormClose={closeCreateForm}
    />
  );
};
