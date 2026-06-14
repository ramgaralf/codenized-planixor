import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('theme-light', 'theme-dark');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('should render the application with routing and theme provider', () => {
    render(<App />);

    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(screen.getAllByRole('navigation', { name: /main navigation/i }).length).toBeGreaterThan(0);
  });

  it('should render the calendar dashboard as the default route', () => {
    render(<App />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
