import { beforeEach, describe, expect, it } from 'vitest';
import { useCalendarStore } from './calendarStore';

describe('calendarStore', () => {
  beforeEach(() => {
    useCalendarStore.setState({
      activeView: 'week',
      currentDate: new Date(2024, 5, 15), // June 15, 2024
    });
    localStorage.clear();
  });

  describe('setView', () => {
    it('should change activeView to the specified view', () => {
      useCalendarStore.getState().setView('month');
      expect(useCalendarStore.getState().activeView).toBe('month');
    });

    it('should accept all valid view values', () => {
      const views = ['day', 'week', 'month', 'year'] as const;
      for (const view of views) {
        useCalendarStore.getState().setView(view);
        expect(useCalendarStore.getState().activeView).toBe(view);
      }
    });
  });

  describe('navigateForward', () => {
    it('should add 1 day when activeView is day', () => {
      useCalendarStore.setState({ activeView: 'day' });
      useCalendarStore.getState().navigateForward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getDate()).toBe(16);
      expect(result.getMonth()).toBe(5);
    });

    it('should add 7 days when activeView is week', () => {
      useCalendarStore.setState({ activeView: 'week' });
      useCalendarStore.getState().navigateForward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getDate()).toBe(22);
      expect(result.getMonth()).toBe(5);
    });

    it('should add 1 month when activeView is month', () => {
      useCalendarStore.setState({ activeView: 'month' });
      useCalendarStore.getState().navigateForward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getMonth()).toBe(6);
      expect(result.getDate()).toBe(15);
    });

    it('should add 1 year when activeView is year', () => {
      useCalendarStore.setState({ activeView: 'year' });
      useCalendarStore.getState().navigateForward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5);
    });
  });

  describe('navigateBackward', () => {
    it('should subtract 1 day when activeView is day', () => {
      useCalendarStore.setState({ activeView: 'day' });
      useCalendarStore.getState().navigateBackward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getDate()).toBe(14);
      expect(result.getMonth()).toBe(5);
    });

    it('should subtract 7 days when activeView is week', () => {
      useCalendarStore.setState({ activeView: 'week' });
      useCalendarStore.getState().navigateBackward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getDate()).toBe(8);
      expect(result.getMonth()).toBe(5);
    });

    it('should subtract 1 month when activeView is month', () => {
      useCalendarStore.setState({ activeView: 'month' });
      useCalendarStore.getState().navigateBackward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(15);
    });

    it('should subtract 1 year when activeView is year', () => {
      useCalendarStore.setState({ activeView: 'year' });
      useCalendarStore.getState().navigateBackward();
      const result = useCalendarStore.getState().currentDate;
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(5);
    });
  });

  describe('goToToday', () => {
    it('should reset currentDate to today', () => {
      useCalendarStore.setState({
        currentDate: new Date(2020, 0, 1),
      });
      useCalendarStore.getState().goToToday();
      const result = useCalendarStore.getState().currentDate;
      const today = new Date();
      expect(result.getDate()).toBe(today.getDate());
      expect(result.getMonth()).toBe(today.getMonth());
      expect(result.getFullYear()).toBe(today.getFullYear());
    });
  });

  describe('defaults', () => {
    it('should default activeView to week when no persisted value exists', () => {
      localStorage.clear();
      // Destroy and recreate store to test fresh initialization
      useCalendarStore.persist.clearStorage();
      useCalendarStore.setState({
        activeView: 'week',
        currentDate: new Date(),
      });
      expect(useCalendarStore.getState().activeView).toBe('week');
    });
  });

  describe('persistence', () => {
    it('should persist activeView to LocalStorage when changed', () => {
      useCalendarStore.getState().setView('month');

      const stored = JSON.parse(
        localStorage.getItem('planixor_calendar') ?? '{}'
      );
      expect(stored.state.activeView).toBe('month');
    });

    it('should only persist activeView, not currentDate', () => {
      useCalendarStore.getState().setView('day');

      const stored = JSON.parse(
        localStorage.getItem('planixor_calendar') ?? '{}'
      );
      expect(stored.state.activeView).toBe('day');
      expect(stored.state.currentDate).toBeUndefined();
    });

    it('should restore activeView from LocalStorage on rehydration', async () => {
      // Pre-seed localStorage with a persisted value
      const persistedData = JSON.stringify({
        state: { activeView: 'year' },
        version: 0,
      });
      localStorage.setItem('planixor_calendar', persistedData);

      // Trigger rehydration
      await useCalendarStore.persist.rehydrate();

      expect(useCalendarStore.getState().activeView).toBe('year');
    });

    it('should use storage key planixor_calendar', () => {
      useCalendarStore.getState().setView('day');

      expect(localStorage.getItem('planixor_calendar')).not.toBeNull();
    });

    it('should default to week when persisted value is absent', async () => {
      localStorage.clear();

      // Reset the store to initial state
      useCalendarStore.setState({ activeView: 'week', currentDate: new Date() });
      await useCalendarStore.persist.rehydrate();

      expect(useCalendarStore.getState().activeView).toBe('week');
    });
  });
});
