import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useReminders } from './useReminders';

const mockT = (key: string) => key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

vi.mock('@features/reminders/services/reminderService', () => ({
  getAll: vi.fn(),
  deactivate: vi.fn(),
  activate: vi.fn(),
  softDelete: vi.fn(),
}));

import * as reminderService from '@features/reminders/services/reminderService';
import type { Reminder } from '@features/reminders/models';

const mockedGetAll = vi.mocked(reminderService.getAll);
const mockedDeactivate = vi.mocked(reminderService.deactivate);
const mockedActivate = vi.mocked(reminderService.activate);
const mockedSoftDelete = vi.mocked(reminderService.softDelete);

const createReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: crypto.randomUUID(),
  name: 'Test Reminder',
  icon: '☀️',
  backgroundColor: '#EF4444',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01'),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('useReminders', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial load', () => {
    it('should start with loading state true', () => {
      mockedGetAll.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useReminders());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.reminders).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should load reminders on mount and set isLoading to false', async () => {
      const reminders = [createReminder({ name: 'Reminder A' }), createReminder({ name: 'Reminder B' })];
      mockedGetAll.mockResolvedValue(reminders);

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reminders).toEqual(reminders);
      expect(result.current.error).toBeNull();
    });

    it('should set error when loading fails', async () => {
      mockedGetAll.mockRejectedValue(new Error('IndexedDB failure'));

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('reminder.error.loadFailed');
      expect(result.current.reminders).toEqual([]);
    });
  });

  describe('refresh', () => {
    it('should reload reminders when refresh is called', async () => {
      const initialReminders = [createReminder({ name: 'Initial' })];
      const updatedReminders = [createReminder({ name: 'Initial' }), createReminder({ name: 'New' })];

      mockedGetAll.mockResolvedValue(initialReminders);

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reminders).toEqual(initialReminders);

      mockedGetAll.mockResolvedValue(updatedReminders);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.reminders).toEqual(updatedReminders);
    });

    it('should set error when refresh fails', async () => {
      mockedGetAll.mockResolvedValue([]);

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockedGetAll.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('reminder.error.loadFailed');
    });
  });

  describe('deactivate', () => {
    it('should call reminderService.deactivate and update local state', async () => {
      const reminder = createReminder({ id: 'r1', isActive: true });
      mockedGetAll.mockResolvedValue([reminder]);
      mockedDeactivate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deactivate('r1');
      });

      expect(mockedDeactivate).toHaveBeenCalledWith('r1');
      expect(result.current.reminders[0].isActive).toBe(false);
    });

    it('should not update state when deactivate service call fails', async () => {
      const reminder = createReminder({ id: 'r1', isActive: true });
      mockedGetAll.mockResolvedValue([reminder]);
      mockedDeactivate.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deactivate('r1');
      });

      expect(result.current.reminders[0].isActive).toBe(true);
    });
  });

  describe('activate', () => {
    it('should call reminderService.activate and update local state', async () => {
      const reminder = createReminder({ id: 'r2', isActive: false });
      mockedGetAll.mockResolvedValue([reminder]);
      mockedActivate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.activate('r2');
      });

      expect(mockedActivate).toHaveBeenCalledWith('r2');
      expect(result.current.reminders[0].isActive).toBe(true);
    });

    it('should not update state when activate service call fails', async () => {
      const reminder = createReminder({ id: 'r2', isActive: false });
      mockedGetAll.mockResolvedValue([reminder]);
      mockedActivate.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.activate('r2');
      });

      expect(result.current.reminders[0].isActive).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('should call reminderService.softDelete and remove from local state', async () => {
      const reminders = [
        createReminder({ id: 'r1', name: 'Keep' }),
        createReminder({ id: 'r2', name: 'Delete' }),
      ];
      mockedGetAll.mockResolvedValue(reminders);
      mockedSoftDelete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.softDelete('r2');
      });

      expect(mockedSoftDelete).toHaveBeenCalledWith('r2');
      expect(result.current.reminders).toHaveLength(1);
      expect(result.current.reminders[0].id).toBe('r1');
    });

    it('should not remove from state when softDelete service call fails', async () => {
      const reminders = [createReminder({ id: 'r1' }), createReminder({ id: 'r2' })];
      mockedGetAll.mockResolvedValue(reminders);
      mockedSoftDelete.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useReminders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.softDelete('r2');
      });

      expect(result.current.reminders).toHaveLength(2);
    });
  });
});
