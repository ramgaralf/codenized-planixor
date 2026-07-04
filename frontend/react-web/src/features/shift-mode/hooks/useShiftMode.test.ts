import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock('@/data/db', () => ({
  db: {
    shiftModeSettings: {
      toCollection: vi.fn(),
      put: vi.fn(),
    },
  },
}));

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';

import type { ShiftModeSetting } from '../models';

import { useShiftMode } from './useShiftMode';

const mockedUseLiveQuery = vi.mocked(useLiveQuery);
const mockedPut = vi.mocked(db.shiftModeSettings.put);
const mockedToCollection = vi.mocked(db.shiftModeSettings.toCollection);

const createSetting = (overrides: Partial<ShiftModeSetting> = {}): ShiftModeSetting => ({
  id: 'test-uuid',
  enabled: false,
  modifiedAt: new Date('2025-01-01'),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('useShiftMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('should return isLoading true and enabled false when useLiveQuery returns undefined', () => {
      mockedUseLiveQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useShiftMode());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.enabled).toBe(false);
    });
  });

  describe('enabled state', () => {
    it('should return enabled false when setting has enabled=false', () => {
      mockedUseLiveQuery.mockReturnValue(createSetting({ enabled: false }));

      const { result } = renderHook(() => useShiftMode());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.enabled).toBe(false);
    });

    it('should return enabled true when setting has enabled=true', () => {
      mockedUseLiveQuery.mockReturnValue(createSetting({ enabled: true }));

      const { result } = renderHook(() => useShiftMode());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.enabled).toBe(true);
    });
  });

  describe('default record creation', () => {
    it('should create a default record when query returns null (no record exists)', async () => {
      mockedUseLiveQuery.mockReturnValue(null);
      mockedPut.mockResolvedValue('new-uuid');

      renderHook(() => useShiftMode());

      await waitFor(() => {
        expect(mockedPut).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
            syncedAt: null,
            isDeleted: false,
          }),
        );
      });
    });

    it('should not create a record when query returns a setting', () => {
      mockedUseLiveQuery.mockReturnValue(createSetting());

      renderHook(() => useShiftMode());

      expect(mockedPut).not.toHaveBeenCalled();
    });

    it('should not create a record while still loading (query returns undefined)', () => {
      mockedUseLiveQuery.mockReturnValue(undefined);

      renderHook(() => useShiftMode());

      expect(mockedPut).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should flip enabled from false to true and update modifiedAt', async () => {
      const existingSetting = createSetting({ enabled: false });
      mockedUseLiveQuery.mockReturnValue(existingSetting);
      mockedToCollection.mockReturnValue({ first: vi.fn().mockResolvedValue(existingSetting) } as never);
      mockedPut.mockResolvedValue('test-uuid');

      const { result } = renderHook(() => useShiftMode());

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockedPut).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          enabled: true,
          syncedAt: null,
        }),
      );

      const putArg = mockedPut.mock.calls[0][0] as ShiftModeSetting;
      expect(putArg.modifiedAt.getTime()).toBeGreaterThan(existingSetting.modifiedAt.getTime());
    });

    it('should flip enabled from true to false and update modifiedAt', async () => {
      const existingSetting = createSetting({ enabled: true });
      mockedUseLiveQuery.mockReturnValue(existingSetting);
      mockedToCollection.mockReturnValue({ first: vi.fn().mockResolvedValue(existingSetting) } as never);
      mockedPut.mockResolvedValue('test-uuid');

      const { result } = renderHook(() => useShiftMode());

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockedPut).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          enabled: false,
          syncedAt: null,
        }),
      );
    });

    it('should set syncedAt to null when toggling (marks as pending sync)', async () => {
      const existingSetting = createSetting({ enabled: false, syncedAt: new Date('2025-06-01') });
      mockedUseLiveQuery.mockReturnValue(existingSetting);
      mockedToCollection.mockReturnValue({ first: vi.fn().mockResolvedValue(existingSetting) } as never);
      mockedPut.mockResolvedValue('test-uuid');

      const { result } = renderHook(() => useShiftMode());

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockedPut).toHaveBeenCalledWith(
        expect.objectContaining({
          syncedAt: null,
        }),
      );
    });

    it('should not call put when no record exists in the database', async () => {
      mockedUseLiveQuery.mockReturnValue(createSetting());
      mockedToCollection.mockReturnValue({ first: vi.fn().mockResolvedValue(undefined) } as never);

      const { result } = renderHook(() => useShiftMode());

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockedPut).not.toHaveBeenCalled();
    });
  });

  describe('useLiveQuery callback', () => {
    it('should pass a query function to useLiveQuery', () => {
      mockedUseLiveQuery.mockReturnValue(createSetting());

      renderHook(() => useShiftMode());

      expect(mockedUseLiveQuery).toHaveBeenCalledWith(expect.any(Function), []);
    });

    it('should return null from query when no record exists', async () => {
      mockedToCollection.mockReturnValue({ first: vi.fn().mockResolvedValue(undefined) } as never);
      mockedPut.mockResolvedValue('new-uuid');
      mockedUseLiveQuery.mockReturnValue(null);

      renderHook(() => useShiftMode());

      const queryFn = mockedUseLiveQuery.mock.calls[0][0] as () => Promise<ShiftModeSetting | null>;
      const queryResult = await queryFn();

      expect(queryResult).toBeNull();
    });

    it('should return existing record from query when one exists', async () => {
      const existingSetting = createSetting({ enabled: true });
      mockedToCollection.mockReturnValue({ first: vi.fn().mockResolvedValue(existingSetting) } as never);
      mockedUseLiveQuery.mockReturnValue(existingSetting);

      renderHook(() => useShiftMode());

      const queryFn = mockedUseLiveQuery.mock.calls[0][0] as () => Promise<ShiftModeSetting | null>;
      const queryResult = await queryFn();

      expect(queryResult).toEqual(existingSetting);
    });
  });
});
