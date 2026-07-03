import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ValidationError } from './ValidationError';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'validation.fieldRequired': 'This field is required',
        'shift.validation.name.required': 'Name is required',
      };
      return translations[key] ?? key;
    },
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

describe('ValidationError', () => {
  it('should render nothing when message is undefined', () => {
    const { container } = render(<ValidationError message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render the translated error message when message is provided', () => {
    render(<ValidationError message="validation.fieldRequired" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('This field is required');
  });

  it('should use role="alert" for accessibility', () => {
    render(<ValidationError message="validation.fieldRequired" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should style with error color CSS variable', () => {
    render(<ValidationError message="validation.fieldRequired" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveStyle({ color: 'var(--color-error)' });
    expect(alert).toHaveStyle({ fontSize: '12px' });
  });

  it('should translate different error keys', () => {
    render(<ValidationError message="shift.validation.name.required" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });
});
