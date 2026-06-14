import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarState {
  activeView: CalendarView;
  currentDate: Date;
  setView: (view: CalendarView) => void;
  navigateForward: () => void;
  navigateBackward: () => void;
  goToToday: () => void;
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

const computeNext = (state: CalendarState): Date => {
  switch (state.activeView) {
    case 'day':
      return addDays(state.currentDate, 1);
    case 'week':
      return addDays(state.currentDate, 7);
    case 'month':
      return addMonths(state.currentDate, 1);
    case 'year':
      return addYears(state.currentDate, 1);
  }
};

const computePrev = (state: CalendarState): Date => {
  switch (state.activeView) {
    case 'day':
      return addDays(state.currentDate, -1);
    case 'week':
      return addDays(state.currentDate, -7);
    case 'month':
      return addMonths(state.currentDate, -1);
    case 'year':
      return addYears(state.currentDate, -1);
  }
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      activeView: 'week',
      currentDate: new Date(),
      setView: (view) => set({ activeView: view }),
      navigateForward: () =>
        set((state) => ({ currentDate: computeNext(state) })),
      navigateBackward: () =>
        set((state) => ({ currentDate: computePrev(state) })),
      goToToday: () => set({ currentDate: new Date() }),
    }),
    {
      name: 'planixor_calendar',
      partialize: (state) => ({ activeView: state.activeView }),
    }
  )
);

export type { CalendarState, CalendarView };
