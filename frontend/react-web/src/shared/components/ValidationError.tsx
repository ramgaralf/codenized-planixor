import { useTranslation } from 'react-i18next';

interface ValidationErrorProps {
  /** The i18n key for the error message. If undefined, nothing is rendered. */
  message: string | undefined;
}

/**
 * Inline validation error display component.
 *
 * Renders a localized error message below a form field.
 * If `message` is undefined, renders nothing.
 *
 * Styled with:
 * - Red text using CSS variable `--color-error`
 * - Small font size (12px)
 * - Poppins font (inherited from global)
 * - role="alert" for screen reader accessibility
 *
 * **Validates: Requirements 8.4, 8.7**
 */
export const ValidationError = ({ message }: ValidationErrorProps) => {
  const { t } = useTranslation();

  if (!message) return null;

  return (
    <p
      role="alert"
      style={{
        color: 'var(--color-error)',
        fontSize: '12px',
        fontWeight: 400,
        margin: '4px 0 0 0',
        lineHeight: 1.4,
      }}
    >
      {t(message)}
    </p>
  );
};
