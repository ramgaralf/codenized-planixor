import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { EmptyState } from './EmptyState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, params?: Record<string, string>) => {
      return params?.defaultValue ?? _key;
    },
  }),
}));

describe('EmptyState', () => {
  it('should render the empty state message', () => {
    render(<EmptyState />);

    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('should have role="status" for screen reader announcements', () => {
    render(<EmptyState />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion).toHaveTextContent('No data to display');
  });

  it('should render with accessible status region containing the message', () => {
    render(<EmptyState />);

    const element = screen.getByRole('status');
    expect(element.textContent).toBe('No data to display');
  });
});
