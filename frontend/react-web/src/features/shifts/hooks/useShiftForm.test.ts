import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useShiftForm } from './useShiftForm';

vi.mock('@features/shifts/services/shiftService', () => ({
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

import * as shiftService from '@features/shifts/services/shiftService';

const mockedGetById = vi.mocked(shiftService.getById);
const mockedCreate = vi.mocked(shiftService.create);
const mockedUpdate = vi.mocked(shiftService.update);

describe('useShiftForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with empty field values when no shiftId is provided', () => {
      const { result } = renderHook(() => useShiftForm());

      expect(result.current.fields).toEqual({
        name: '',
        icon: '',
        backgroundColor: '',
        startTime: null,
        endTime: null,
        hoursWorked: null,
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should set isLoading to true when shiftId is provided', () => {
      mockedGetById.mockResolvedValue(undefined);
      const { result } = renderHook(() => useShiftForm({ shiftId: 'abc-123' }));

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('edit mode (loading existing shift)', () => {
    it('should load and populate fields when shiftId is provided', async () => {
      vi.useRealTimers();

      mockedGetById.mockResolvedValue({
        id: 'abc-123',
        name: 'Morning',
        icon: '☀️',
        backgroundColor: '#EF4444',
        startTime: 480,
        endTime: 960,
        hoursWorked: 480,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() => useShiftForm({ shiftId: 'abc-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fields.name).toBe('Morning');
      expect(result.current.fields.icon).toBe('☀️');
      expect(result.current.fields.backgroundColor).toBe('#EF4444');
      expect(result.current.fields.startTime).toBe(480);
      expect(result.current.fields.endTime).toBe(960);
      expect(result.current.fields.hoursWorked).toBe(480);
    });
  });

  describe('setField', () => {
    it('should update the specified field value', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('name', 'Night Shift');
      });

      expect(result.current.fields.name).toBe('Night Shift');
    });

    it('should auto-calculate hoursWorked when both startTime and endTime are set', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 480); // 08:00
      });
      act(() => {
        result.current.setField('endTime', 960); // 16:00
      });

      expect(result.current.fields.hoursWorked).toBe(480);
    });

    it('should handle overnight shifts in hoursWorked calculation', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 1320); // 22:00
      });
      act(() => {
        result.current.setField('endTime', 360); // 06:00
      });

      expect(result.current.fields.hoursWorked).toBe(480);
    });

    it('should calculate 1440 when startTime equals endTime', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 480);
      });
      act(() => {
        result.current.setField('endTime', 480);
      });

      expect(result.current.fields.hoursWorked).toBe(1440);
    });

    it('should clear hoursWorked when startTime is cleared', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 480);
      });
      act(() => {
        result.current.setField('endTime', 960);
      });
      expect(result.current.fields.hoursWorked).toBe(480);

      act(() => {
        result.current.setField('startTime', null);
      });

      expect(result.current.fields.hoursWorked).toBeNull();
    });

    it('should clear hoursWorked when endTime is cleared', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 480);
      });
      act(() => {
        result.current.setField('endTime', 960);
      });
      expect(result.current.fields.hoursWorked).toBe(480);

      act(() => {
        result.current.setField('endTime', null);
      });

      expect(result.current.fields.hoursWorked).toBeNull();
    });
  });

  describe('manual override tracking', () => {
    it('should stop auto-calculating when hoursWorked is manually set', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 480);
      });
      act(() => {
        result.current.setField('endTime', 960);
      });
      expect(result.current.fields.hoursWorked).toBe(480);

      // Manual override
      act(() => {
        result.current.setField('hoursWorked', 420);
      });
      expect(result.current.fields.hoursWorked).toBe(420);
    });

    it('should recalculate hoursWorked when time changes after manual override', () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('startTime', 480);
      });
      act(() => {
        result.current.setField('endTime', 960);
      });

      // Manual override
      act(() => {
        result.current.setField('hoursWorked', 420);
      });
      expect(result.current.fields.hoursWorked).toBe(420);

      // Changing startTime should recalculate, discarding the manual override
      act(() => {
        result.current.setField('startTime', 540); // 09:00
      });

      // Recalculated: 960 - 540 = 420 (coincidentally same, let's use different value)
      expect(result.current.fields.hoursWorked).toBe(420);

      // Use a more distinctive test
      act(() => {
        result.current.setField('endTime', 1020); // 17:00
      });

      // 1020 - 540 = 480
      expect(result.current.fields.hoursWorked).toBe(480);
    });
  });

  describe('debounced validation', () => {
    it('should validate a field after 1 second debounce', async () => {
      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('name', '');
      });

      // Before debounce fires, no error
      expect(result.current.errors.name).toBeUndefined();

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errors.name).toBeDefined();
    });

    it('should clear error when field is corrected', async () => {
      const { result } = renderHook(() => useShiftForm());

      // Set invalid value
      act(() => {
        result.current.setField('name', '   ');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.errors.name).toBeDefined();

      // Fix it
      act(() => {
        result.current.setField('name', 'Valid Name');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('should return false and set errors when validation fails', async () => {
      const { result } = renderHook(() => useShiftForm());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.submit();
      });

      expect(success).toBe(false);
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    });

    it('should call shiftService.create when form is valid and no shiftId', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        name: 'Morning',
        icon: '☀️',
        backgroundColor: '#EF4444',
        startTime: 480,
        endTime: 960,
        hoursWorked: 480,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('name', 'Morning');
        result.current.setField('icon', '☀️');
        result.current.setField('backgroundColor', '#EF4444');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
        result.current.setField('hoursWorked', 480);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.submit();
      });

      expect(success).toBe(true);
      expect(mockedCreate).toHaveBeenCalledWith({
        name: 'Morning',
        icon: '☀️',
        backgroundColor: '#EF4444',
        startTime: 480,
        endTime: 960,
        hoursWorked: 480,
      });
    });

    it('should call shiftService.update when form is valid and shiftId is provided', async () => {
      vi.useRealTimers();

      mockedGetById.mockResolvedValue({
        id: 'abc-123',
        name: 'Morning',
        icon: '☀️',
        backgroundColor: '#EF4444',
        startTime: 480,
        endTime: 960,
        hoursWorked: 480,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });
      mockedUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useShiftForm({ shiftId: 'abc-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setField('name', 'Evening');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.submit();
      });

      expect(success).toBe(true);
      expect(mockedUpdate).toHaveBeenCalledWith('abc-123', {
        name: 'Evening',
        icon: '☀️',
        backgroundColor: '#EF4444',
        startTime: 480,
        endTime: 960,
        hoursWorked: 480,
      });
    });

    it('should set isSubmitting to true during submission', async () => {
      mockedCreate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('name', 'Morning');
        result.current.setField('icon', '☀️');
        result.current.setField('backgroundColor', '#EF4444');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
        result.current.setField('hoursWorked', 480);
      });

      let submitPromise: Promise<boolean>;
      act(() => {
        submitPromise = result.current.submit();
      });

      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await submitPromise!;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should return false when shiftService throws', async () => {
      mockedCreate.mockRejectedValue(new Error('DB failure'));

      const { result } = renderHook(() => useShiftForm());

      act(() => {
        result.current.setField('name', 'Morning');
        result.current.setField('icon', '☀️');
        result.current.setField('backgroundColor', '#EF4444');
        result.current.setField('startTime', 480);
        result.current.setField('endTime', 960);
        result.current.setField('hoursWorked', 480);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.submit();
      });

      expect(success).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
