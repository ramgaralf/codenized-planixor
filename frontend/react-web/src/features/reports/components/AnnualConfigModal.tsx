import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MIN_HOURS = 1;
const MAX_HOURS = 8784;
const PLACEHOLDER_VALUE = '1800';
const DIGITS_ONLY_REGEX = /^\d*$/;

interface AnnualConfigModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** The year for which the configuration applies */
  selectedYear: number;
  /** Existing configured value, or null if no config exists */
  existingValue: number | null;
  /** Called when user saves a valid hours value */
  onSave: (configuredHours: number) => Promise<void>;
  /** Called when user clears an existing config (soft-delete) */
  onDelete: () => Promise<void>;
  /** Called to dismiss the modal without changes */
  onClose: () => void;
}

/**
 * AnnualConfigModal — dialog for setting or clearing annual working hours.
 *
 * Centered dialog with:
 * - Numeric input (digits only, range 1–8784, localized error message)
 * - Save button (disabled when validation fails)
 * - Cancel button (always enabled)
 *
 * Behavior:
 * - Empty input with existing config → soft-delete on submit
 * - Empty input with no existing config → no-op, dismiss
 * - Pre-populate with existing value or show placeholder "1800"
 * - Dismiss on cancel/click-outside/escape without saving
 * - Submit + dismiss race: prioritize submit
 * - On save success: dismiss modal, trigger chart refresh via callback
 * - Focus trap within modal when open
 *
 * _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 12.6_
 */
export const AnnualConfigModal = ({
  isOpen,
  selectedYear,
  existingValue,
  onSave,
  onDelete,
  onClose,
}: AnnualConfigModalProps) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  // Initialize input value when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue(existingValue !== null ? String(existingValue) : '');
      setValidationError(null);
      setIsSubmitting(false);
      isSubmittingRef.current = false;

      // Focus input after render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, existingValue]);

  const validate = useCallback(
    (value: string): string | null => {
      if (value === '') return null;
      const numericValue = Number(value);
      if (numericValue < MIN_HOURS || numericValue > MAX_HOURS) {
        return t('reports.annualConfig.rangeError', {
          defaultValue: 'Value must be between 1 and 8,784',
        });
      }
      return null;
    },
    [t],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow only digits (0-9), no decimals/letters/special chars
      if (!DIGITS_ONLY_REGEX.test(raw)) return;

      setInputValue(raw);
      setValidationError(validate(raw));
    },
    [validate],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (inputValue === '') {
        if (existingValue !== null) {
          // Empty input with existing config → soft-delete
          await onDelete();
        }
        // Empty input with no existing config → no-op
        onClose();
        return;
      }

      const numericValue = Number(inputValue);
      const error = validate(inputValue);
      if (error) {
        setValidationError(error);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      await onSave(numericValue);
      onClose();
    } catch (err) {
      console.error('Failed to save annual config:', err);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [inputValue, existingValue, onSave, onDelete, onClose, validate]);

  const handleDismiss = useCallback(() => {
    // Submit + dismiss race: prioritize submit
    if (isSubmittingRef.current) return;
    onClose();
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleDismiss();
      }
    },
    [handleDismiss],
  );

  // Keyboard handling: Escape to dismiss, Tab trap, Enter to submit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (!isOpen) return null;

  const hasValidationError = validationError !== null;
  const isSaveDisabled = hasValidationError || isSubmitting;
  const titleId = 'annual-config-modal-title';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      role="presentation"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h2
          id={titleId}
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
          }}
        >
          {t('reports.annualConfig.title', {
            year: selectedYear,
            defaultValue: `Annual hours — ${selectedYear}`,
          })}
        </h2>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="annual-hours-input"
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {t('reports.annualConfig.label', {
              defaultValue: 'Configured working hours',
            })}
          </label>
          <input
            ref={inputRef}
            id="annual-hours-input"
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_VALUE}
            aria-invalid={hasValidationError}
            aria-describedby={hasValidationError ? 'annual-config-error' : undefined}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${hasValidationError ? 'var(--color-error)' : 'var(--color-border)'}`,
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 400,
              outline: 'none',
              width: '100%',
            }}
          />
          {hasValidationError && (
            <span
              id="annual-config-error"
              role="alert"
              style={{
                color: 'var(--color-error)',
                fontSize: '12px',
                fontWeight: 400,
                marginTop: '2px',
              }}
            >
              {validationError}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-3" style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
              opacity: isSaveDisabled ? 0.7 : 1,
            }}
          >
            {isSubmitting
              ? '...'
              : t('common.save', { defaultValue: 'Save' })}
          </button>
        </div>
      </div>
    </div>
  );
};
