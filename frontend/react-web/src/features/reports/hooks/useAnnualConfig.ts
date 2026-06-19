import { useCallback } from 'react';

import { db } from '@/data/db';
import type { AnnualHoursConfig } from '@features/reports/models';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MIN_HOURS = 1;
const MAX_HOURS = 8784;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface UseAnnualConfigReturn {
  save: (year: number, configuredHours: number) => Promise<void>;
  softDelete: (year: number) => Promise<void>;
  getByYear: (year: number) => Promise<AnnualHoursConfig | null>;
  validateAnnualConfig: (year: number, configuredHours: number) => ValidationResult;
}

/**
 * Validates that year is in [2000, 2100] and configuredHours is in [1, 8784].
 * Returns a validation result with an optional error message.
 */
export const validateAnnualConfig = (
  year: number,
  configuredHours: number,
): ValidationResult => {
  if (
    !Number.isInteger(year) ||
    year < MIN_YEAR ||
    year > MAX_YEAR
  ) {
    return { valid: false, error: `Year must be an integer between ${MIN_YEAR} and ${MAX_YEAR}` };
  }

  if (
    !Number.isInteger(configuredHours) ||
    configuredHours < MIN_HOURS ||
    configuredHours > MAX_HOURS
  ) {
    return { valid: false, error: `Configured hours must be an integer between ${MIN_HOURS} and ${MAX_HOURS}` };
  }

  return { valid: true };
};

/**
 * useAnnualConfig — custom hook for Annual Hours Configuration CRUD operations.
 *
 * Provides save, softDelete, getByYear, and validation for the
 * annualHoursConfig table. Enforces uniqueness (one non-deleted record per year)
 * and validates year/configuredHours ranges before persisting.
 *
 * All operations are offline-first against IndexedDB via Dexie.
 *
 * _Requirements: 8.7, 8.8, 8.11, 9.2, 9.4, 9.6_
 */
export const useAnnualConfig = (): UseAnnualConfigReturn => {
  /**
   * Retrieves the non-deleted AnnualHoursConfig for a given year, or null if none exists.
   */
  const getByYear = useCallback(async (year: number): Promise<AnnualHoursConfig | null> => {
    const record = await db.annualHoursConfig
      .where('year')
      .equals(year)
      .filter((r) => r.isDeleted === false)
      .first();

    return record ?? null;
  }, []);

  /**
   * Saves (upserts) an AnnualHoursConfig record for a given year.
   *
   * - Validates year (2000–2100) and configuredHours (1–8784).
   * - If a non-deleted record for the year already exists, updates it (preserves its id).
   * - Otherwise creates a new record with a client-generated UUID.
   * - Sets modifiedAt to now and syncedAt to null on every write.
   *
   * Throws if validation fails.
   */
  const save = useCallback(async (year: number, configuredHours: number): Promise<void> => {
    const validation = validateAnnualConfig(year, configuredHours);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const now = new Date();

    const existing = await db.annualHoursConfig
      .where('year')
      .equals(year)
      .filter((r) => r.isDeleted === false)
      .first();

    if (existing) {
      await db.annualHoursConfig.update(existing.id, {
        configuredHours,
        modifiedAt: now,
        syncedAt: null,
      });
    } else {
      const record: AnnualHoursConfig = {
        id: crypto.randomUUID(),
        year,
        configuredHours,
        modifiedAt: now,
        syncedAt: null,
        isDeleted: false,
      };
      await db.annualHoursConfig.add(record);
    }
  }, []);

  /**
   * Soft-deletes the non-deleted AnnualHoursConfig record for a given year.
   *
   * Sets isDeleted=true, modifiedAt=now, syncedAt=null.
   * No-op if no non-deleted record exists for the year.
   */
  const softDelete = useCallback(async (year: number): Promise<void> => {
    const existing = await db.annualHoursConfig
      .where('year')
      .equals(year)
      .filter((r) => r.isDeleted === false)
      .first();

    if (!existing) {
      return;
    }

    await db.annualHoursConfig.update(existing.id, {
      isDeleted: true,
      modifiedAt: new Date(),
      syncedAt: null,
    });
  }, []);

  return {
    save,
    softDelete,
    getByYear,
    validateAnnualConfig,
  };
};
