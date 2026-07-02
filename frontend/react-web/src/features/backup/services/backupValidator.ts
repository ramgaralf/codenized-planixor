import {
  CURRENT_SCHEMA_VERSION,
  MAX_BACKUP_SIZE_BYTES,
} from '../models';
import type { ValidationError } from '../models';

/**
 * Result of backup file validation.
 *
 * When `isValid` is true, `error` is null and the file can be safely parsed.
 * When `isValid` is false, `error` describes the specific failing rule.
 */
export interface ValidationResult {
  isValid: boolean;
  error: ValidationError | null;
}

const REQUIRED_METADATA_FIELDS: { name: string; type: string }[] = [
  { name: 'createdAt', type: 'string' },
  { name: 'appVersion', type: 'string' },
  { name: 'platform', type: 'string' },
  { name: 'schemaVersion', type: 'number' },
];

const REQUIRED_DATA_ARRAYS = [
  'calendarEvents',
  'notificationRecords',
  'annualHoursConfig',
  'shifts',
  'reminders',
  'syncConfig',
] as const;

const MAX_SIZE_MB = 50;

const validateMetadataFields = (metadata: Record<string, unknown>): string[] => {
  const missing: string[] = [];
  for (const field of REQUIRED_METADATA_FIELDS) {
    if (typeof metadata[field.name] !== field.type) {
      missing.push(field.name);
    }
  }
  return missing;
};

const validateDataArrays = (data: Record<string, unknown>): string[] => {
  const missing: string[] = [];
  for (const arrayName of REQUIRED_DATA_ARRAYS) {
    if (!Array.isArray(data[arrayName])) {
      missing.push(arrayName);
    }
  }
  return missing;
};

/**
 * Validates a backup file's content and size through a sequential pipeline.
 *
 * Checks (in order):
 * 1. File size <= 50 MB
 * 2. Valid JSON
 * 3. Metadata object with required fields and correct types
 * 4. Data object with all six entity arrays
 * 5. Schema version <= current supported version
 *
 * Returns the first error encountered (no accumulation).
 */
export const validateBackupFile = (content: string, fileSize: number): ValidationResult => {
  // 1. Size check
  if (fileSize > MAX_BACKUP_SIZE_BYTES) {
    return { isValid: false, error: { type: 'FILE_TOO_LARGE', maxMb: MAX_SIZE_MB } };
  }

  // 2. JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    return { isValid: false, error: { type: 'INVALID_JSON', details: message } };
  }

  // 3. Metadata validation
  if (typeof parsed !== 'object' || parsed === null) {
    return { isValid: false, error: { type: 'INVALID_SCHEMA', missingFields: ['metadata'] } };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.metadata !== 'object' || obj.metadata === null) {
    return { isValid: false, error: { type: 'INVALID_SCHEMA', missingFields: ['metadata'] } };
  }

  const metadata = obj.metadata as Record<string, unknown>;
  const missingMetadataFields = validateMetadataFields(metadata);

  if (missingMetadataFields.length > 0) {
    return { isValid: false, error: { type: 'INVALID_SCHEMA', missingFields: missingMetadataFields } };
  }

  // 4. Entity arrays validation
  if (typeof obj.data !== 'object' || obj.data === null) {
    return { isValid: false, error: { type: 'INVALID_SCHEMA', missingFields: ['data'] } };
  }

  const data = obj.data as Record<string, unknown>;
  const missingArrays = validateDataArrays(data);

  if (missingArrays.length > 0) {
    return { isValid: false, error: { type: 'INVALID_SCHEMA', missingFields: missingArrays } };
  }

  // 5. Version check
  const schemaVersion = metadata.schemaVersion as number;
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      isValid: false,
      error: {
        type: 'INCOMPATIBLE_VERSION',
        fileVersion: schemaVersion,
        maxSupported: CURRENT_SCHEMA_VERSION,
      },
    };
  }

  // All checks passed
  return { isValid: true, error: null };
};
