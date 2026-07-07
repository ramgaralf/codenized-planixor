import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReminderForm } from './useReminderForm';

vi.mock('@features/reminders/services/reminderService', () => ({
  create: vi.fn(),
  update: vi.fn(),
  getById: vi.fn(),
}));

vi.mock('@features/reminders/services/reminderPropagation', () => ({
  checkReminderPropagationNeeded: vi.fn(),
  propagateReminderChanges: vi.fn(),
}));

import * as reminderService from '@features/reminders/services/reminderService';
import * as reminderPropagation from '@features/reminders/services/reminderPropagation';

const mockedCreate = vi.mocked(reminderService.create);
const mockedUpdate = vi.mocked(reminderService.update);
const mockedGetById = vi.mocked(reminderService.getById);
const mockedCheckPropagation = vi.mocked(reminderPropagation.checkReminderPropagationNeeded);
const mockedPropagate = vi.mocked(reminderPropagation.propagateReminderChanges);

const VALID_VALUES = {
  name: 'Morning Reminder',
  icon: '☀️',
  backgroundColor: '#EF4444',
};

describe('useReminderForm', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with empty values when no initialValues provided', () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      expect(result.current.name).toBe('');
      expect(result.current.icon).toBe('');
      expect(result.current.backgroundColor).toBe('');
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.saveError).toBeNull();
    });

    it('should initialize with provided initialValues for edit mode', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          reminderId: 'abc-123',
          onSuccess: mockOnSuccess,
        }),
      );

      expect(result.current.name).toBe('Morning Reminder');
      expect(result.current.icon).toBe('☀️');
      expect(result.current.backgroundColor).toBe('#EF4444');
    });
  });

  describe('field setters', () => {
    it('should update name when setName is called', () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      act(() => {
        result.current.setName('New Name');
      });

      expect(result.current.name).toBe('New Name');
    });

    it('should update icon when setIcon is called', () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      act(() => {
        result.current.setIcon('🎉');
      });

      expect(result.current.icon).toBe('🎉');
    });

    it('should update backgroundColor when setBackgroundColor is called', () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      act(() => {
        result.current.setBackgroundColor('#2563EB');
      });

      expect(result.current.backgroundColor).toBe('#2563EB');
    });

    it('should clear saveError when any field is changed', async () => {
      mockedCreate.mockRejectedValueOnce(new Error('DB failure'));

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      // Trigger a save error
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.saveError).toBe('reminder.error.saveFailed');

      // Changing a field should clear the saveError
      act(() => {
        result.current.setName('Another Name');
      });

      expect(result.current.saveError).toBeNull();
    });
  });

  describe('debounced validation', () => {
    it('should validate name field after 1 second debounce', () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      act(() => {
        result.current.setName('   ');
      });

      // Before debounce fires, no error
      expect(result.current.errors.name).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errors.name).toBeDefined();
    });

    it('should clear error when field is corrected', () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      // Set invalid value and trigger debounce
      act(() => {
        result.current.setName('   ');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.errors.name).toBeDefined();

      // Fix it
      act(() => {
        result.current.setName('Valid Name');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('should debounce icon validation', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: { name: 'Test', icon: '', backgroundColor: '#EF4444' },
          onSuccess: mockOnSuccess,
        }),
      );

      act(() => {
        result.current.setIcon('not-an-emoji');
      });

      expect(result.current.errors.icon).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errors.icon).toBeDefined();
    });

    it('should debounce backgroundColor validation', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: { name: 'Test', icon: '☀️', backgroundColor: '' },
          onSuccess: mockOnSuccess,
        }),
      );

      act(() => {
        result.current.setBackgroundColor('#INVALID');
      });

      expect(result.current.errors.backgroundColor).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errors.backgroundColor).toBeDefined();
    });
  });

  describe('isValid', () => {
    it('should be true when all fields have valid values and no errors', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      expect(result.current.isValid).toBe(true);
    });

    it('should be false when name is empty', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: { ...VALID_VALUES, name: '' },
          onSuccess: mockOnSuccess,
        }),
      );

      expect(result.current.isValid).toBe(false);
    });

    it('should be false when icon is empty', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: { ...VALID_VALUES, icon: '' },
          onSuccess: mockOnSuccess,
        }),
      );

      expect(result.current.isValid).toBe(false);
    });

    it('should be false when backgroundColor is empty', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: { ...VALID_VALUES, backgroundColor: '' },
          onSuccess: mockOnSuccess,
        }),
      );

      expect(result.current.isValid).toBe(false);
    });

    it('should be false when there are validation errors', () => {
      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      // Trigger an error
      act(() => {
        result.current.setName('   ');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  describe('handleSubmit', () => {
    it('should set errors and not call service when validation fails', async () => {
      const { result } = renderHook(() =>
        useReminderForm({ onSuccess: mockOnSuccess }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
      expect(mockedCreate).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should call reminderService.create when valid and no reminderId', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        ...VALID_VALUES,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedCreate).toHaveBeenCalledWith({ ...VALID_VALUES, seriesFrequency: 'never', seriesEndDate: null });
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should call reminderService.update when valid and reminderId is provided', async () => {
      mockedUpdate.mockResolvedValue(undefined);
      mockedGetById.mockResolvedValue({
        id: 'abc-123',
        name: 'Morning Reminder',
        icon: '☀️',
        backgroundColor: '#EF4444',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
      });
      mockedCheckPropagation.mockResolvedValue(0);

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          reminderId: 'abc-123',
          onSuccess: mockOnSuccess,
        }),
      );

      act(() => {
        result.current.setName('Updated Name');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedUpdate).toHaveBeenCalledWith('abc-123', {
        name: 'Updated Name',
        icon: VALID_VALUES.icon,
        backgroundColor: VALID_VALUES.backgroundColor,
        seriesFrequency: 'never',
        seriesEndDate: null,
      });
      expect(mockedCheckPropagation).toHaveBeenCalledWith('abc-123');
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should set isSaving during submission', async () => {
      let resolveCreate: () => void;
      mockedCreate.mockImplementation(
        () =>
          new Promise<ReturnType<typeof reminderService.create> extends Promise<infer R> ? R : never>((resolve) => {
            resolveCreate = () =>
              resolve({
                id: 'new-id',
                ...VALID_VALUES,
                isActive: true,
                createdAt: new Date(),
                modifiedAt: new Date(),
                syncedAt: null,
                isDeleted: false,
              });
          }),
      );

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      // Start submission without awaiting
      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.handleSubmit();
      });

      // isSaving should be true while create is pending
      expect(result.current.isSaving).toBe(true);

      // Resolve the create call
      await act(async () => {
        resolveCreate!();
        await submitPromise;
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('should set saveError when service throws', async () => {
      mockedCreate.mockRejectedValue(new Error('DB failure'));

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.saveError).toBe('reminder.error.saveFailed');
      expect(result.current.isSaving).toBe(false);
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('pre-population for edit mode', () => {
    it('should update fields when initialValues change', () => {
      const initialProps = {
        initialValues: VALID_VALUES,
        reminderId: 'abc-123',
        onSuccess: mockOnSuccess,
      };

      const { result, rerender } = renderHook(
        (props: typeof initialProps) => useReminderForm(props),
        { initialProps },
      );

      expect(result.current.name).toBe('Morning Reminder');

      const newValues = {
        name: 'Evening Reminder',
        icon: '🌙',
        backgroundColor: '#7C3AED',
      };

      rerender({
        initialValues: newValues,
        reminderId: 'abc-123',
        onSuccess: mockOnSuccess,
      });

      expect(result.current.name).toBe('Evening Reminder');
      expect(result.current.icon).toBe('🌙');
      expect(result.current.backgroundColor).toBe('#7C3AED');
    });
  });

  describe('propagation flow', () => {
    it('should open propagation modal when edit affects calendar events', async () => {
      mockedUpdate.mockResolvedValue(undefined);
      mockedGetById.mockResolvedValue({
        id: 'abc-123',
        name: 'Morning Reminder',
        icon: '☀️',
        backgroundColor: '#EF4444',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
      });
      mockedCheckPropagation.mockResolvedValue(5);

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          reminderId: 'abc-123',
          onSuccess: mockOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.propagationState).toEqual({ isOpen: true, affectedCount: 5 });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should not check propagation in create mode', async () => {
      mockedCreate.mockResolvedValue({
        id: 'new-id',
        ...VALID_VALUES,
        isActive: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
        isDeleted: false,
      });

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          onSuccess: mockOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedCheckPropagation).not.toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should propagate changes and call onSuccess when confirmed', async () => {
      mockedUpdate.mockResolvedValue(undefined);
      mockedGetById.mockResolvedValue({
        id: 'abc-123',
        name: 'Morning Reminder',
        icon: '☀️',
        backgroundColor: '#EF4444',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
      });
      mockedCheckPropagation.mockResolvedValue(3);
      mockedPropagate.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          reminderId: 'abc-123',
          onSuccess: mockOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.propagationState.isOpen).toBe(true);

      await act(async () => {
        await result.current.confirmPropagation();
      });

      expect(mockedPropagate).toHaveBeenCalledWith('abc-123');
      expect(result.current.propagationState).toEqual({ isOpen: false, affectedCount: 0 });
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should skip propagation and call onSuccess when declined', async () => {
      mockedUpdate.mockResolvedValue(undefined);
      mockedGetById.mockResolvedValue({
        id: 'abc-123',
        name: 'Morning Reminder',
        icon: '☀️',
        backgroundColor: '#EF4444',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
        syncedAt: null,
      });
      mockedCheckPropagation.mockResolvedValue(2);

      const { result } = renderHook(() =>
        useReminderForm({
          initialValues: VALID_VALUES,
          reminderId: 'abc-123',
          onSuccess: mockOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.propagationState.isOpen).toBe(true);

      act(() => {
        result.current.declinePropagation();
      });

      expect(mockedPropagate).not.toHaveBeenCalled();
      expect(result.current.propagationState).toEqual({ isOpen: false, affectedCount: 0 });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
