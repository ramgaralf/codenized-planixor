import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CALENDAR_EVENT_I18N_KEYS } from '../constants';
import type { CalendarEvent } from '../models';

vi.mock('@/stores/calendarStore', () => ({
  useCalendarStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({
      activeView: 'day',
      currentDate: new Date(2024, 5, 15), // June 15, 2024
    }),
  ),
}));

vi.mock('../services/calendarEventService', () => ({
  create: vi.fn(),
  update: vi.fn(),
  getShiftsForDate: vi.fn(),
}));

vi.mock('@/data/db', () => ({
  db: {
    shifts: { get: vi.fn() },
    reminders: { get: vi.fn() },
  },
}));

import { useCalendarStore } from '@/stores/calendarStore';

import * as calendarEventService from '../services/calendarEventService';

import { useEventForm } from './useEventForm';

const mockedCreate = vi.mocked(calendarEventService.create);
const mockedUpdate = vi.mocked(calendarEventService.update);
const mockedGetShiftsForDate = vi.mocked(calendarEventService.getShiftsForDate);
const mockedUseCalendarStore = vi.mocked(useCalendarStore);

describe('useEventForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetShiftsForDate.mockResolvedValue([]);
    mockedUseCalendarStore.mockImplementation((selector) =>
      selector({
        activeView: 'day',
        currentDate: new Date(2024, 5, 15), // June 15, 2024
      } as never),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with empty fields and pre-selected day in create mode', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.formState).toEqual({
        eventType: null,
        eventTypeId: null,
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: null,
        endTime: null,
        totalHours: 0,
        notes: '',
      });
      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.formError).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isEditMode).toBe(false);
    });

    it('should populate fields from existingEvent in edit mode', () => {
      const existingEvent: CalendarEvent = {
        id: 'evt-1',
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2024-06-20',
        endDay: '2024-06-20',
        startTime: 480,
        endTime: 960,
        totalHours: 480,
        notes: 'Test note',
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      };

      const { result } = renderHook(() => useEventForm({ existingEvent }));

      expect(result.current.formState).toEqual({
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2024-06-20',
        endDay: '2024-06-20',
        startTime: 480,
        endTime: 960,
        totalHours: 480,
        notes: 'Test note',
      });
      expect(result.current.isEditMode).toBe(true);
    });

    it('should handle existingEvent with null notes', () => {
      const existingEvent: CalendarEvent = {
        id: 'evt-1',
        eventType: 'reminder',
        eventTypeId: 'rem-1',
        startDay: '2024-06-20',
        endDay: '2024-06-20',
        startTime: 540,
        endTime: 600,
        totalHours: 60,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      };

      const { result } = renderHook(() => useEventForm({ existingEvent }));

      expect(result.current.formState.notes).toBe('');
    });
  });

  describe('day pre-selection (Requirements 9.1–9.6)', () => {
    it('should pre-select displayed day in day view (Req 9.1)', () => {
      mockedUseCalendarStore.mockImplementation((selector) =>
        selector({
          activeView: 'day',
          currentDate: new Date(2024, 7, 20), // Aug 20, 2024
        } as never),
      );

      const { result } = renderHook(() => useEventForm());

      expect(result.current.formState.startDay).toBe('2024-08-20');
      expect(result.current.formState.endDay).toBe('2024-08-20');
    });

    it('should pre-select today in week view when today is within displayed week (Req 9.2)', () => {
      const today = new Date();
      mockedUseCalendarStore.mockImplementation((selector) =>
        selector({
          activeView: 'week',
          currentDate: today,
        } as never),
      );

      const { result } = renderHook(() => useEventForm());

      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      expect(result.current.formState.startDay).toBe(`${year}-${month}-${day}`);
    });

    it('should pre-select Monday of displayed week when today is NOT within it (Req 9.3)', () => {
      // Set displayed week far in the future so today is not within it
      mockedUseCalendarStore.mockImplementation((selector) =>
        selector({
          activeView: 'week',
          currentDate: new Date(2030, 0, 7), // Jan 7, 2030 (a Monday)
        } as never),
      );

      const { result } = renderHook(() => useEventForm());

      // Jan 7, 2030 is a Monday, so Monday of that week is Jan 7
      expect(result.current.formState.startDay).toBe('2030-01-07');
    });

    it('should pre-select today in month view when today is within displayed month (Req 9.4)', () => {
      const today = new Date();
      mockedUseCalendarStore.mockImplementation((selector) =>
        selector({
          activeView: 'month',
          currentDate: today,
        } as never),
      );

      const { result } = renderHook(() => useEventForm());

      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      expect(result.current.formState.startDay).toBe(`${year}-${month}-${day}`);
    });

    it('should pre-select first day of displayed month when today is NOT within it (Req 9.5)', () => {
      // Set displayed month far in the future
      mockedUseCalendarStore.mockImplementation((selector) =>
        selector({
          activeView: 'month',
          currentDate: new Date(2030, 5, 15), // June 2030
        } as never),
      );

      const { result } = renderHook(() => useEventForm());

      expect(result.current.formState.startDay).toBe('2030-06-01');
    });

    it('should pre-select current device date in year view when today is within displayed year (Req 9.6)', () => {
      const today = new Date();
      mockedUseCalendarStore.mockImplementation((selector) =>
        selector({
          activeView: 'year',
          currentDate: today,
        } as never),
      );

      const { result } = renderHook(() => useEventForm());

      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      expect(result.current.formState.startDay).toBe(`${year}-${month}-${day}`);
    });
  });

  describe('setField', () => {
    it('should update the specified field value', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'shift');
      });

      expect(result.current.formState.eventType).toBe('shift');
    });

    it('should immediately clear the error for the changed field', async () => {
      const { result } = renderHook(() => useEventForm());

      // Trigger validation errors by submitting empty form
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.fieldErrors.eventType).toBeDefined();

      // Fix the field
      act(() => {
        result.current.setField('eventType', 'shift');
      });

      expect(result.current.fieldErrors.eventType).toBeUndefined();
    });

    it('should clear form-level error when startDay field changes', async () => {
      // Set up a shift conflict
      mockedGetShiftsForDate.mockResolvedValue([
        {
          id: 'existing-shift',
          eventType: 'shift',
          eventTypeId: 'shift-1',
          startDay: '2024-06-15',
          endDay: '2024-06-15',
          startTime: 480,
          endTime: 960,
          totalHours: 480,
          notes: null,
          modifiedAt: new Date(),
          syncedAt: null,
          isDeleted: false,
        },
      ]);

      const { result } = renderHook(() => useEventForm());

      // Fill all fields to pass required validation
      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('eventTypeId', 'shift-2');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      // Submit to trigger one-shift-per-day error
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.formError).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY,
      );

      // Change startDay to clear form error
      act(() => {
        result.current.setField('startDay', '2024-06-16');
      });

      expect(result.current.formError).toBeNull();
    });

    it('should clear form-level error when eventType changes', async () => {
      mockedGetShiftsForDate.mockResolvedValue([
        {
          id: 'existing-shift',
          eventType: 'shift',
          eventTypeId: 'shift-1',
          startDay: '2024-06-15',
          endDay: '2024-06-15',
          startTime: 480,
          endTime: 960,
          totalHours: 480,
          notes: null,
          modifiedAt: new Date(),
          syncedAt: null,
          isDeleted: false,
        },
      ]);

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('eventTypeId', 'shift-2');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.formError).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY,
      );

      act(() => {
        result.current.setField('eventType', 'reminder');
      });

      expect(result.current.formError).toBeNull();
    });
  });

  describe('handleSubmit — validation', () => {
    it('should set field errors when required fields are missing', async () => {
      const { result } = renderHook(() => useEventForm());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.fieldErrors.eventType).toBeDefined();
      expect(result.current.fieldErrors.eventTypeId).toBeDefined();
      expect(result.current.fieldErrors.startTime).toBeDefined();
      expect(result.current.fieldErrors.endTime).toBeDefined();
    });

    it('should set endTime error when time is invalid for same-day reminder', async () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 960);
        result.current.setField('endTime', 480); // Before start on same day
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.fieldErrors.endTime).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER,
      );
    });

    it('should set notes error when notes exceed 250 characters', async () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
        result.current.setField('notes', 'x'.repeat(251));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.fieldErrors.notes).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_NOTES_MAX_LENGTH,
      );
    });

    it('should set form-level error for one-shift-per-day violation', async () => {
      mockedGetShiftsForDate.mockResolvedValue([
        {
          id: 'existing-shift',
          eventType: 'shift',
          eventTypeId: 'shift-1',
          startDay: '2024-06-15',
          endDay: '2024-06-15',
          startTime: 480,
          endTime: 960,
          totalHours: 480,
          notes: null,
          modifiedAt: new Date(),
          syncedAt: null,
          isDeleted: false,
        },
      ]);

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('eventTypeId', 'shift-2');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      // One-shift-per-day is form-level, not field-level
      expect(result.current.formError).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY,
      );
      expect(result.current.fieldErrors).toEqual({});
    });

    it('should not check one-shift-per-day when eventType is reminder', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        eventType: 'reminder',
        eventTypeId: 'rem-1',
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 960,
        totalHours: 480,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.formError).toBeNull();
      expect(mockedCreate).toHaveBeenCalled();
    });
  });

  describe('handleSubmit — create mode', () => {
    it('should call calendarEventService.create with correct data', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 960,
        totalHours: 480,
        notes: 'Morning shift',
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useEventForm({ onSuccess }));

      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('eventTypeId', 'shift-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
        result.current.setField('notes', 'Morning shift');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedCreate).toHaveBeenCalledWith({
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 960,
        notes: 'Morning shift',
      });
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should clear form state after successful creation', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 960,
        totalHours: 480,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('eventTypeId', 'shift-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.formState.eventType).toBeNull();
      expect(result.current.formState.eventTypeId).toBeNull();
      expect(result.current.formState.startTime).toBeNull();
      expect(result.current.formState.endTime).toBeNull();
      expect(result.current.formState.notes).toBe('');
    });

    it('should pass null for notes when notes is empty string', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        eventType: 'reminder',
        eventTypeId: 'rem-1',
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 960,
        totalHours: 480,
        notes: null,
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      );
    });
  });

  describe('handleSubmit — edit mode', () => {
    const existingEvent: CalendarEvent = {
      id: 'evt-1',
      eventType: 'shift',
      eventTypeId: 'shift-1',
      startDay: '2024-06-15',
      endDay: '2024-06-15',
      startTime: 480,
      endTime: 960,
      totalHours: 480,
      notes: null,
      modifiedAt: new Date(),
      syncedAt: null,
      isDeleted: false,
    };

    it('should call calendarEventService.update with event id', async () => {
      mockedUpdate.mockResolvedValue({
        ...existingEvent,
        endTime: 1020,
        modifiedAt: new Date(),
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useEventForm({ existingEvent, onSuccess }),
      );

      act(() => {
        result.current.setField('endTime', 1020);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedUpdate).toHaveBeenCalledWith('evt-1', {
        eventType: 'shift',
        eventTypeId: 'shift-1',
        startDay: '2024-06-15',
        endDay: '2024-06-15',
        startTime: 480,
        endTime: 1020,
        notes: null,
      });
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should exclude current event from one-shift-per-day check', async () => {
      mockedGetShiftsForDate.mockResolvedValue([]);
      mockedUpdate.mockResolvedValue({
        ...existingEvent,
        modifiedAt: new Date(),
      });

      const { result } = renderHook(() => useEventForm({ existingEvent }));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedGetShiftsForDate).toHaveBeenCalledWith(
        '2024-06-15',
        'evt-1',
      );
    });
  });

  describe('handleSubmit — error handling', () => {
    it('should set formError for one-shift-per-day error from service', async () => {
      mockedCreate.mockRejectedValue(
        new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY),
      );
      mockedGetShiftsForDate.mockResolvedValue([]);

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('eventTypeId', 'shift-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.formError).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY,
      );
    });

    it('should set field error for time range error from service', async () => {
      mockedCreate.mockRejectedValue(
        new Error(CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER),
      );
      mockedGetShiftsForDate.mockResolvedValue([]);

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.fieldErrors.endTime).toBe(
        CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER,
      );
    });

    it('should set generic formError for unexpected errors', async () => {
      mockedCreate.mockRejectedValue(new Error('DB write failed'));
      mockedGetShiftsForDate.mockResolvedValue([]);

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.formError).toBe(
        CALENDAR_EVENT_I18N_KEYS.ERROR_SAVE_FAILED,
      );
    });

    it('should set isSubmitting during submission and reset on error', async () => {
      let rejectFn: (err: Error) => void;
      mockedCreate.mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectFn = reject;
          }),
      );
      mockedGetShiftsForDate.mockResolvedValue([]);

      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('eventType', 'reminder');
        result.current.setField('eventTypeId', 'rem-1');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
      });

      let submitPromise: Promise<void>;
      await act(async () => {
        submitPromise = result.current.handleSubmit();
      });

      // After validation passes and create is called (but not resolved), isSubmitting should be true
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        rejectFn!(new Error('fail'));
        await submitPromise!;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('handleCancel', () => {
    it('should call onCancel callback without persisting anything', () => {
      const onCancel = vi.fn();
      const { result } = renderHook(() => useEventForm({ onCancel }));

      act(() => {
        result.current.setField('eventType', 'shift');
        result.current.setField('notes', 'Unsaved data');
      });

      act(() => {
        result.current.handleCancel();
      });

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(mockedCreate).not.toHaveBeenCalled();
      expect(mockedUpdate).not.toHaveBeenCalled();
    });

    it('should not throw when onCancel is not provided', () => {
      const { result } = renderHook(() => useEventForm());

      expect(() => {
        act(() => {
          result.current.handleCancel();
        });
      }).not.toThrow();
    });
  });
});
