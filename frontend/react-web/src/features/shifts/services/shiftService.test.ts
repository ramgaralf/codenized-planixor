import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '@/data/db';

import { SHIFT_I18N_KEYS } from '@features/shifts/constants';

import { create, getAll, getById, update, softDelete, deactivate, activate } from './shiftService';

const validInput = {
  name: 'Morning Shift',
  icon: '☀️',
  backgroundColor: '#EF4444',
  startTime: 480,
  endTime: 1020,
  hoursWorked: 540,
};

describe('shiftService', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('create', () => {
    it('should generate a UUID as id', async () => {
      const shift = await create(validInput);

      expect(shift.id).toBeDefined();
      expect(shift.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should set system fields correctly', async () => {
      const before = new Date();
      const shift = await create(validInput);
      const after = new Date();

      expect(shift.isActive).toBe(true);
      expect(shift.isDeleted).toBe(false);
      expect(shift.syncedAt).toBeNull();
      expect(shift.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(shift.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(shift.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(shift.modifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should preserve user-provided fields', async () => {
      const shift = await create(validInput);

      expect(shift.name).toBe(validInput.name);
      expect(shift.icon).toBe(validInput.icon);
      expect(shift.backgroundColor).toBe(validInput.backgroundColor);
      expect(shift.startTime).toBe(validInput.startTime);
      expect(shift.endTime).toBe(validInput.endTime);
      expect(shift.hoursWorked).toBe(validInput.hoursWorked);
    });

    it('should persist the shift to the database', async () => {
      const shift = await create(validInput);
      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe(validInput.name);
    });

    it('should allow duplicate names', async () => {
      const shift1 = await create(validInput);
      const shift2 = await create(validInput);

      expect(shift1.id).not.toBe(shift2.id);
      expect(shift1.name).toBe(shift2.name);
    });

    it('should accept hoursWorked of 0', async () => {
      const shift = await create({ ...validInput, hoursWorked: 0 });

      expect(shift.hoursWorked).toBe(0);
    });

    it('should accept hoursWorked of 1440', async () => {
      const shift = await create({ ...validInput, hoursWorked: 1440 });

      expect(shift.hoursWorked).toBe(1440);
    });

    it('should reject hoursWorked below 0', async () => {
      await expect(create({ ...validInput, hoursWorked: -1 })).rejects.toThrow(
        SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE,
      );
    });

    it('should reject hoursWorked above 1440', async () => {
      await expect(create({ ...validInput, hoursWorked: 1441 })).rejects.toThrow(
        SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE,
      );
    });
  });

  describe('getAll', () => {
    it('should return only non-deleted shifts', async () => {
      await create(validInput);
      const shift2 = await create({ ...validInput, name: 'Afternoon Shift' });
      await softDelete(shift2.id);

      const shifts = await getAll();

      expect(shifts).toHaveLength(1);
      expect(shifts[0]!.name).toBe('Morning Shift');
    });

    it('should order by createdAt ascending', async () => {
      const shift1 = await create({ ...validInput, name: 'First' });
      // Small delay to ensure different createdAt
      await new Promise((resolve) => setTimeout(resolve, 10));
      const shift2 = await create({ ...validInput, name: 'Second' });

      const shifts = await getAll();

      expect(shifts).toHaveLength(2);
      expect(shifts[0]!.id).toBe(shift1.id);
      expect(shifts[1]!.id).toBe(shift2.id);
    });

    it('should return empty array when no shifts exist', async () => {
      const shifts = await getAll();

      expect(shifts).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return the shift when it exists', async () => {
      const created = await create(validInput);
      const retrieved = await getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return undefined when shift does not exist', async () => {
      const retrieved = await getById('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update the specified fields', async () => {
      const shift = await create(validInput);
      await update(shift.id, { name: 'Updated Name' });

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.name).toBe('Updated Name');
    });

    it('should preserve id, syncedAt, and isDeleted', async () => {
      const shift = await create(validInput);
      const originalId = shift.id;

      await update(shift.id, { name: 'Updated' });

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.id).toBe(originalId);
      expect(retrieved!.syncedAt).toBeNull();
      expect(retrieved!.isDeleted).toBe(false);
    });

    it('should update modifiedAt to a recent timestamp', async () => {
      const shift = await create(validInput);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const before = new Date();
      await update(shift.id, { name: 'Updated' });
      const after = new Date();

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(retrieved!.modifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept hoursWorked of 0 in update', async () => {
      const shift = await create(validInput);
      await update(shift.id, { hoursWorked: 0 });

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.hoursWorked).toBe(0);
    });

    it('should reject hoursWorked below 0 in update', async () => {
      const shift = await create(validInput);

      await expect(update(shift.id, { hoursWorked: -1 })).rejects.toThrow(
        SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE,
      );
    });

    it('should reject hoursWorked above 1440 in update', async () => {
      const shift = await create(validInput);

      await expect(update(shift.id, { hoursWorked: 1441 })).rejects.toThrow(
        SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE,
      );
    });

    it('should not validate hoursWorked when not provided in update', async () => {
      const shift = await create(validInput);

      await expect(update(shift.id, { name: 'New Name' })).resolves.not.toThrow();
    });
  });

  describe('softDelete', () => {
    it('should set isDeleted to true', async () => {
      const shift = await create(validInput);
      await softDelete(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.isDeleted).toBe(true);
    });

    it('should set syncedAt to null', async () => {
      const shift = await create(validInput);
      // Simulate a previously synced shift
      await db.shifts.update(shift.id, { syncedAt: new Date() });

      await softDelete(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.syncedAt).toBeNull();
    });

    it('should update modifiedAt', async () => {
      const shift = await create(validInput);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const before = new Date();
      await softDelete(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const shift = await create(validInput);

      expect(shift.isActive).toBe(true);

      await deactivate(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.isActive).toBe(false);
    });

    it('should update modifiedAt', async () => {
      const shift = await create(validInput);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const before = new Date();
      await deactivate(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('activate', () => {
    it('should set isActive to true', async () => {
      const shift = await create(validInput);
      await deactivate(shift.id);

      await activate(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.isActive).toBe(true);
    });

    it('should update modifiedAt', async () => {
      const shift = await create(validInput);
      await deactivate(shift.id);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const before = new Date();
      await activate(shift.id);

      const retrieved = await db.shifts.get(shift.id);

      expect(retrieved!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
