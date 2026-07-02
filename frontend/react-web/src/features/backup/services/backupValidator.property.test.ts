// Feature: gh22-backups, Property 2: Validation Correctness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { validateBackupFile } from './backupValidator';
import { CURRENT_SCHEMA_VERSION, MAX_BACKUP_SIZE_BYTES } from '../models';

// **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

const REQUIRED_DATA_ARRAYS = [
  'calendarEvents',
  'notificationRecords',
  'annualHoursConfig',
  'shifts',
  'reminders',
  'syncConfig',
] as const;

const REQUIRED_METADATA_FIELDS = ['createdAt', 'appVersion', 'platform', 'schemaVersion'] as const;

/**
 * Arbitrary: generates a valid backup file JSON object (not stringified).
 */
const arbValidBackupObject = () =>
  fc.record({
    metadata: fc.record({
      createdAt: fc.integer({ min: 1577836800000, max: 1924991999000 }).map((ms) => new Date(ms).toISOString()),
      appVersion: fc.tuple(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
      ).map(([maj, min, pat]) => `${maj}.${min}.${pat}`),
      platform: fc.constantFrom('web', 'android'),
      schemaVersion: fc.integer({ min: 1, max: CURRENT_SCHEMA_VERSION }),
    }),
    data: fc.record({
      calendarEvents: fc.constant([]),
      notificationRecords: fc.constant([]),
      annualHoursConfig: fc.constant([]),
      shifts: fc.constant([]),
      reminders: fc.constant([]),
      syncConfig: fc.constant([]),
    }),
  });

/**
 * Arbitrary: generates a valid backup JSON string and its byte size.
 */
const arbValidBackupJson = () =>
  arbValidBackupObject().map((obj) => {
    const json = JSON.stringify(obj);
    const size = new TextEncoder().encode(json).length;
    return { json, size };
  });

describe('backupValidator — Property 2: Validation Correctness', () => {
  it('should accept any valid backup file (valid JSON, correct schema, compatible version, within size limit)', () => {
    fc.assert(
      fc.property(arbValidBackupJson(), ({ json, size }) => {
        const result = validateBackupFile(json, size);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('should reject files exceeding 50 MB with FILE_TOO_LARGE error', () => {
    fc.assert(
      fc.property(
        arbValidBackupJson(),
        fc.integer({ min: MAX_BACKUP_SIZE_BYTES + 1, max: MAX_BACKUP_SIZE_BYTES + 10_000_000 }),
        ({ json }, oversizedFileSize) => {
          const result = validateBackupFile(json, oversizedFileSize);

          expect(result.isValid).toBe(false);
          expect(result.error).not.toBeNull();
          expect(result.error!.type).toBe('FILE_TOO_LARGE');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject invalid JSON content with INVALID_JSON error', () => {
    const arbInvalidJson = fc
      .string({ minLength: 1, maxLength: 500 })
      .filter((s) => {
        try {
          JSON.parse(s);
          return false;
        } catch {
          return true;
        }
      });

    fc.assert(
      fc.property(arbInvalidJson, (invalidContent) => {
        const size = new TextEncoder().encode(invalidContent).length;
        const result = validateBackupFile(invalidContent, size);

        expect(result.isValid).toBe(false);
        expect(result.error).not.toBeNull();
        expect(result.error!.type).toBe('INVALID_JSON');
      }),
      { numRuns: 100 },
    );
  });

  it('should reject JSON with missing metadata fields with INVALID_SCHEMA error', () => {
    const arbMissingMetadataFields = fc.tuple(
      arbValidBackupObject(),
      fc.subarray([...REQUIRED_METADATA_FIELDS], { minLength: 1 }),
    ).map(([obj, fieldsToRemove]) => {
      const metadata = { ...obj.metadata } as Record<string, unknown>;
      for (const field of fieldsToRemove) {
        delete metadata[field];
      }
      return { ...obj, metadata };
    });

    fc.assert(
      fc.property(arbMissingMetadataFields, (backupObj) => {
        const json = JSON.stringify(backupObj);
        const size = new TextEncoder().encode(json).length;
        const result = validateBackupFile(json, size);

        expect(result.isValid).toBe(false);
        expect(result.error).not.toBeNull();
        expect(result.error!.type).toBe('INVALID_SCHEMA');
      }),
      { numRuns: 100 },
    );
  });

  it('should reject JSON with missing data entity arrays with INVALID_SCHEMA error', () => {
    const arbMissingDataArrays = fc.tuple(
      arbValidBackupObject(),
      fc.subarray([...REQUIRED_DATA_ARRAYS], { minLength: 1 }),
    ).map(([obj, arraysToRemove]) => {
      const data = { ...obj.data } as Record<string, unknown>;
      for (const arrayName of arraysToRemove) {
        delete data[arrayName];
      }
      return { ...obj, data };
    });

    fc.assert(
      fc.property(arbMissingDataArrays, (backupObj) => {
        const json = JSON.stringify(backupObj);
        const size = new TextEncoder().encode(json).length;
        const result = validateBackupFile(json, size);

        expect(result.isValid).toBe(false);
        expect(result.error).not.toBeNull();
        expect(result.error!.type).toBe('INVALID_SCHEMA');
      }),
      { numRuns: 100 },
    );
  });

  it('should reject backup files with schemaVersion > current with INCOMPATIBLE_VERSION error', () => {
    fc.assert(
      fc.property(
        arbValidBackupObject(),
        fc.integer({ min: CURRENT_SCHEMA_VERSION + 1, max: CURRENT_SCHEMA_VERSION + 100 }),
        (backupObj, futureVersion) => {
          const modified = {
            ...backupObj,
            metadata: { ...backupObj.metadata, schemaVersion: futureVersion },
          };
          const json = JSON.stringify(modified);
          const size = new TextEncoder().encode(json).length;
          const result = validateBackupFile(json, size);

          expect(result.isValid).toBe(false);
          expect(result.error).not.toBeNull();
          expect(result.error!.type).toBe('INCOMPATIBLE_VERSION');
        },
      ),
      { numRuns: 100 },
    );
  });
});
