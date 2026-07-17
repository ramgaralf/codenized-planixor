import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/db', () => ({
  db: {
    shiftModeSettings: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { db } from '@/data/db';
import { deduplicateShiftModeSettings } from './shiftModeCleanup';

const mockedShiftModeSettings = vi.mocked(db.shiftModeSettings);

describe('deduplicateShiftModeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 0 and not delete anything when no records exist', async () => {
    mockedShiftModeSettings.toArray.mockResolvedValue([]);

    const result = await deduplicateShiftModeSettings();

    expect(result).toBe(0);
    expect(mockedShiftModeSettings.bulkDelete).not.toHaveBeenCalled();
  });

  it('should return 0 and not delete anything when exactly 1 record exists', async () => {
    mockedShiftModeSettings.toArray.mockResolvedValue([
      {
        id: 'single-id',
        enabled: true,
        modifiedAt: new Date('2025-06-20T10:00:00Z'),
        syncedAt: null,
        isDeleted: false,
      },
    ]);

    const result = await deduplicateShiftModeSettings();

    expect(result).toBe(0);
    expect(mockedShiftModeSettings.bulkDelete).not.toHaveBeenCalled();
  });

  it('should keep the most recently modified record and delete the rest', async () => {
    const newestRecord = {
      id: 'newest-id',
      enabled: true,
      modifiedAt: new Date('2025-06-20T14:00:00Z'),
      syncedAt: null,
      isDeleted: false,
    };
    const olderRecord = {
      id: 'older-id',
      enabled: false,
      modifiedAt: new Date('2025-06-20T10:00:00Z'),
      syncedAt: null,
      isDeleted: false,
    };
    const oldestRecord = {
      id: 'oldest-id',
      enabled: false,
      modifiedAt: new Date('2025-06-20T08:00:00Z'),
      syncedAt: new Date('2025-06-20T08:00:00Z'),
      isDeleted: false,
    };

    mockedShiftModeSettings.toArray.mockResolvedValue([olderRecord, newestRecord, oldestRecord]);

    const result = await deduplicateShiftModeSettings();

    expect(result).toBe(2);
    expect(mockedShiftModeSettings.bulkDelete).toHaveBeenCalledWith(['older-id', 'oldest-id']);
  });

  it('should delete duplicates when 2 records exist', async () => {
    const newer = {
      id: 'newer-id',
      enabled: true,
      modifiedAt: new Date('2025-06-20T12:00:00Z'),
      syncedAt: null,
      isDeleted: false,
    };
    const older = {
      id: 'older-id',
      enabled: false,
      modifiedAt: new Date('2025-06-20T08:00:00Z'),
      syncedAt: null,
      isDeleted: false,
    };

    mockedShiftModeSettings.toArray.mockResolvedValue([older, newer]);

    const result = await deduplicateShiftModeSettings();

    expect(result).toBe(1);
    expect(mockedShiftModeSettings.bulkDelete).toHaveBeenCalledWith(['older-id']);
  });
});
