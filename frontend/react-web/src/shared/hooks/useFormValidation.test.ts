import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useFormValidation, type FieldValidation } from './useFormValidation';

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  interface TestForm {
    name: string;
    email: string;
    color: string | null;
  }

  const requiredFields: Record<keyof TestForm, FieldValidation> = {
    name: { required: true },
    email: { required: true },
    color: { required: true },
  };

  describe('validateAll', () => {
    it('should return true and have no errors when all required fields are filled', () => {
      const values: TestForm = { name: 'John', email: 'john@test.com', color: '#FF0000' };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
      expect(result.current.hasErrors).toBe(false);
    });

    it('should return false and set errors when required fields are empty strings', () => {
      const values: TestForm = { name: '', email: '', color: null };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.name).toBe('validation.fieldRequired');
      expect(result.current.errors.email).toBe('validation.fieldRequired');
      expect(result.current.errors.color).toBe('validation.fieldRequired');
      expect(result.current.hasErrors).toBe(true);
    });

    it('should return false when required text fields contain only whitespace', () => {
      const values: TestForm = { name: '   ', email: ' \t\n ', color: '#000' };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.name).toBe('validation.fieldRequired');
      expect(result.current.errors.email).toBe('validation.fieldRequired');
      expect(result.current.errors.color).toBeUndefined();
    });

    it('should return false when required field is null or undefined', () => {
      const values: TestForm = { name: 'Valid', email: 'valid@test.com', color: null };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.color).toBe('validation.fieldRequired');
      expect(result.current.errors.name).toBeUndefined();
    });

    it('should scroll to and focus the first error field on failure', () => {
      const values: TestForm = { name: '', email: 'valid@test.com', color: '#000' };

      const mockElement = {
        scrollIntoView: vi.fn(),
        focus: vi.fn(),
      };

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as unknown as HTMLElement);

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      act(() => {
        result.current.validateAll();
      });

      expect(document.querySelector).toHaveBeenCalledWith('[name="name"], [data-field="name"]');
      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(mockElement.focus).toHaveBeenCalled();
    });
  });

  describe('validateField', () => {
    it('should set error for a single field when invalid', () => {
      const values: TestForm = { name: '', email: 'valid@test.com', color: '#000' };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      act(() => {
        result.current.validateField('name');
      });

      expect(result.current.errors.name).toBe('validation.fieldRequired');
      expect(result.current.errors.email).toBeUndefined();
      expect(result.current.errors.color).toBeUndefined();
    });

    it('should clear error for a field when it becomes valid', () => {
      const values: TestForm = { name: '', email: 'valid@test.com', color: '#000' };

      const { result, rerender } = renderHook(
        ({ vals }) => useFormValidation(requiredFields, vals),
        { initialProps: { vals: values } },
      );

      act(() => {
        result.current.validateField('name');
      });
      expect(result.current.errors.name).toBe('validation.fieldRequired');

      // Simulate user typing a value
      rerender({ vals: { name: 'John', email: 'valid@test.com', color: '#000' } });

      act(() => {
        result.current.validateField('name');
      });
      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe('clearFieldError', () => {
    it('should remove the error for the specified field', () => {
      const values: TestForm = { name: '', email: '', color: null };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      act(() => {
        result.current.validateAll();
      });
      expect(result.current.errors.name).toBeDefined();

      act(() => {
        result.current.clearFieldError('name');
      });
      expect(result.current.errors.name).toBeUndefined();
      // Other errors remain
      expect(result.current.errors.email).toBe('validation.fieldRequired');
    });

    it('should be a no-op when the field has no error', () => {
      const values: TestForm = { name: 'Valid', email: 'valid@test.com', color: '#000' };

      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      act(() => {
        result.current.clearFieldError('name');
      });
      expect(result.current.errors).toEqual({});
    });
  });

  describe('custom validate function', () => {
    it('should use custom validate function and return its error key', () => {
      const fields: Record<keyof TestForm, FieldValidation> = {
        name: { required: true },
        email: {
          required: true,
          validate: (value) => {
            if (typeof value === 'string' && !value.includes('@')) {
              return 'validation.invalidEmail';
            }
            return null;
          },
        },
        color: { required: true },
      };

      const values: TestForm = { name: 'John', email: 'invalid-email', color: '#000' };

      const { result } = renderHook(() => useFormValidation(fields, values));

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.email).toBe('validation.invalidEmail');
    });

    it('should check required before custom validate', () => {
      const customValidate = vi.fn().mockReturnValue(null);
      const fields: Record<keyof TestForm, FieldValidation> = {
        name: { required: true, validate: customValidate },
        email: { required: true },
        color: { required: true },
      };

      const values: TestForm = { name: '', email: 'valid@test.com', color: '#000' };

      const { result } = renderHook(() => useFormValidation(fields, values));

      act(() => {
        result.current.validateAll();
      });

      // Required check fails first, custom validate not called
      expect(result.current.errors.name).toBe('validation.fieldRequired');
      expect(customValidate).not.toHaveBeenCalled();
    });
  });

  describe('hasErrors', () => {
    it('should be false initially', () => {
      const values: TestForm = { name: 'John', email: 'john@test.com', color: '#000' };
      const { result } = renderHook(() => useFormValidation(requiredFields, values));
      expect(result.current.hasErrors).toBe(false);
    });

    it('should be true after validateAll finds errors', () => {
      const values: TestForm = { name: '', email: '', color: null };
      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      act(() => {
        result.current.validateAll();
      });
      expect(result.current.hasErrors).toBe(true);
    });

    it('should become false after all errors are cleared', () => {
      const values: TestForm = { name: '', email: 'valid@test.com', color: '#000' };
      const { result } = renderHook(() => useFormValidation(requiredFields, values));

      act(() => {
        result.current.validateAll();
      });
      expect(result.current.hasErrors).toBe(true);

      act(() => {
        result.current.clearFieldError('name');
      });
      expect(result.current.hasErrors).toBe(false);
    });
  });
});
