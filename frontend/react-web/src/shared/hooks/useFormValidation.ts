import { useCallback, useRef, useState } from 'react';

/**
 * Defines validation rules for a single form field.
 */
export interface FieldValidation {
  /** Whether the field is required (non-empty / non-null / non-whitespace for strings). */
  required?: boolean;
  /** Custom validator function. Returns an i18n key string on failure, or null if valid. */
  validate?: (value: unknown) => string | null;
}

/**
 * Result returned by the useFormValidation hook.
 */
export interface UseFormValidationResult<T> {
  /** Current validation errors keyed by field name. Value is an i18n key. */
  errors: Partial<Record<keyof T, string>>;
  /** Validates all fields. Returns true if all valid, false otherwise. On failure, focuses the first error field. */
  validateAll: () => boolean;
  /** Validates a single field and updates errors accordingly. */
  validateField: (field: keyof T) => void;
  /** Clears the error for a specific field immediately. */
  clearFieldError: (field: keyof T) => void;
  /** Whether any errors currently exist. */
  hasErrors: boolean;
}

const REQUIRED_ERROR_KEY = 'validation.fieldRequired';

/**
 * Checks if a value is considered "empty" for validation purposes.
 * - null / undefined → empty
 * - string with only whitespace → empty
 * - everything else → not empty
 */
const isFieldEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
};

/**
 * Validates a single field against its validation config.
 * Returns an i18n error key or null if valid.
 */
const validateSingleField = <T extends Record<string, unknown>>(
  field: keyof T,
  fieldConfig: FieldValidation,
  values: T,
): string | null => {
  const value = values[field];

  if (fieldConfig.required && isFieldEmpty(value)) {
    return REQUIRED_ERROR_KEY;
  }

  if (fieldConfig.validate) {
    return fieldConfig.validate(value);
  }

  return null;
};

/**
 * Generic form validation hook for Planixor React Web.
 *
 * Provides:
 * - `validateAll()`: checks all fields, sets errors, returns boolean. On failure, scrolls to and focuses first error field.
 * - `clearFieldError(field)`: removes error for that field immediately (call on input change).
 * - `validateField(field)`: validates a single field (for on-blur or on-change validation).
 * - `hasErrors`: whether any errors currently exist.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
 */
export const useFormValidation = <T extends Record<string, unknown>>(
  fields: Record<keyof T, FieldValidation>,
  values: T,
): UseFormValidationResult<T> => {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const fieldOrderRef = useRef<(keyof T)[]>(Object.keys(fields) as (keyof T)[]);

  const validateField = useCallback(
    (field: keyof T) => {
      const fieldConfig = fields[field];
      if (!fieldConfig) return;

      const error = validateSingleField(field, fieldConfig, values);

      setErrors((prev) => {
        if (error) {
          return { ...prev, [field]: error };
        }
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    [fields, values],
  );

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let firstErrorField: keyof T | null = null;

    for (const field of fieldOrderRef.current) {
      const fieldConfig = fields[field];
      if (!fieldConfig) continue;

      const error = validateSingleField(field, fieldConfig, values);
      if (error) {
        newErrors[field] = error;
        if (firstErrorField === null) {
          firstErrorField = field;
        }
      }
    }

    setErrors(newErrors);

    if (firstErrorField !== null) {
      // Focus the first error field — look for element by name attribute or data-field
      requestAnimationFrame(() => {
        const selector = `[name="${String(firstErrorField)}"], [data-field="${String(firstErrorField)}"]`;
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
          element.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      });
      return false;
    }

    return true;
  }, [fields, values]);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    validateAll,
    validateField,
    clearFieldError,
    hasErrors,
  };
};
