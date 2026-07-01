import { db } from '@/data/db';

import {
  SHIFT_HOURS_WORKED_MAX,
  SHIFT_HOURS_WORKED_MIN,
  SHIFT_I18N_KEYS,
} from '@features/shifts/constants';
import type { Shift } from '@features/shifts/models';

/**
 * Validates that hoursWorked falls within [SHIFT_HOURS_WORKED_MIN, SHIFT_HOURS_WORKED_MAX].
 * Throws an error with the i18n key if out of range.
 */
const validateHoursWorkedRange = (hoursWorked: number): void => {
  if (hoursWorked < SHIFT_HOURS_WORKED_MIN || hoursWorked > SHIFT_HOURS_WORKED_MAX) {
    throw new Error(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
  }
};

/**
 * Input type for creating a new shift.
 * System-managed fields (id, modifiedAt, syncedAt, isDeleted, isActive, createdAt)
 * are generated automatically.
 */
export type CreateShiftInput = Omit<
  Shift,
  'id' | 'modifiedAt' | 'syncedAt' | 'isDeleted' | 'isActive' | 'createdAt'
>;

/**
 * Retrieves all non-deleted shifts ordered by createdAt ascending (oldest first).
 */
export const getAll = async (): Promise<Shift[]> => {
  return db.shifts
    .orderBy('createdAt')
    .filter((shift) => shift.isDeleted === false)
    .toArray();
};

/**
 * Retrieves a single shift by its ID.
 * Returns undefined if the shift does not exist.
 */
export const getById = async (id: string): Promise<Shift | undefined> => {
  return db.shifts.get(id);
};

/**
 * Creates a new shift with system-generated fields.
 * Duplicate names are permitted (no uniqueness check on name).
 */
export const create = async (input: CreateShiftInput): Promise<Shift> => {
  validateHoursWorkedRange(input.hoursWorked);

  const now = new Date();

  const shift: Shift = {
    ...input,
    id: crypto.randomUUID(),
    isActive: true,
    createdAt: now,
    modifiedAt: now,
    syncedAt: null,
    isDeleted: false,
  };

  await db.shifts.add(shift);

  return shift;
};

/**
 * Updates an existing shift.
 * Preserves id, syncedAt, and isDeleted. Updates modifiedAt to now.
 */
export const update = async (
  id: string,
  data: Partial<Omit<Shift, 'id' | 'syncedAt' | 'isDeleted'>>,
): Promise<void> => {
  if (data.hoursWorked !== undefined) {
    validateHoursWorkedRange(data.hoursWorked);
  }

  await db.shifts.update(id, {
    ...data,
    modifiedAt: new Date(),
  });
};

/**
 * Soft-deletes a shift by setting isDeleted = true, syncedAt = null,
 * and updating modifiedAt.
 */
export const softDelete = async (id: string): Promise<void> => {
  await db.shifts.update(id, {
    isDeleted: true,
    syncedAt: null,
    modifiedAt: new Date(),
  });
};

/**
 * Deactivates a shift by setting isActive = false and updating modifiedAt.
 */
export const deactivate = async (id: string): Promise<void> => {
  await db.shifts.update(id, {
    isActive: false,
    modifiedAt: new Date(),
  });
};

/**
 * Activates a shift by setting isActive = true and updating modifiedAt.
 */
export const activate = async (id: string): Promise<void> => {
  await db.shifts.update(id, {
    isActive: true,
    modifiedAt: new Date(),
  });
};
