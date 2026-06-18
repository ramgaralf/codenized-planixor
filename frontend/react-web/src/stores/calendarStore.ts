import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarState {
  activeView: CalendarView;
  currentDate: Date;
  /** When true, the calendar-events container shows the create form */
  showCreateForm: boolean;
  setView: (view: CalendarView) => void;
  /** Navigate by ±1 day */
  navigateDay: (direction: 1 | -1) => void;
  /** Navigate by ±1 week (7 days) */
  navigateWeek: (direction: 1 | -1) => void;
  /** Navigate by ±1 month */
  navigateMonth: (direction: 1 | -1) => void;
  /** Navigate by ±1 year */
  navigateYear: (direction: 1 | -1) => void;
  /** @deprecated Use navigateDay, navigateWeek, navigateMonth, or navigateYear instead */
  navigateForward: () => void;
  /** @deprecated Use navigateDay, navigateWeek, navigateMonth, or navigateYear instead */
  navigateBackward: () => void;
  goToToday: () => void;
  /** Open the event creation form (triggered by top bar "New Event" button) */
  openCreateForm: () => void;
  /** Close the event creation form */
  closeCreateForm: () => void;
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      activeView: 'day',
      currentDate: new Date(),
      showCreateForm: false,
      setView: (view) => set({ activeView: view }),
      navigateDay: (direction) =>
        set((state) => ({ currentDate: addDays(state.currentDate, direction) })),
      navigateWeek: (direction) =>
        set((state) => ({ currentDate: addDays(state.currentDate, 7 * direction) })),
      navigateMonth: (direction) =>
        set((state) => ({ currentDate: addMonths(state.currentDate, direction) })),
      navigateYear: (direction) =>
        set((state) => ({ currentDate: addYears(state.currentDate, direction) })),
      /** @deprecated Use granular navigation methods instead */
      navigateForward: () => {
        const state = get();
        switch (state.activeView) {
          case 'day':
            state.navigateDay(1);
            break;
          case 'week':
            state.navigateWeek(1);
            break;
          case 'month':
            state.navigateMonth(1);
            break;
          case 'year':
            state.navigateYear(1);
            break;
        }
      },
      /** @deprecated Use granular navigation methods instead */
      navigateBackward: () => {
        const state = get();
        switch (state.activeView) {
          case 'day':
            state.navigateDay(-1);
            break;
          case 'week':
            state.navigateWeek(-1);
            break;
          case 'month':
            state.navigateMonth(-1);
            break;
          case 'year':
            state.navigateYear(-1);
            break;
        }
      },
      goToToday: () => set({ currentDate: new Date() }),
      openCreateForm: () => set({ showCreateForm: true }),
      closeCreateForm: () => set({ showCreateForm: false }),
    }),
    {
      name: 'planixor_calendar',
      partialize: (state) => ({ activeView: state.activeView }),
    }
  )
);

export type { CalendarState, CalendarView };
