import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FAB } from './FAB';

describe('FAB', () => {
  it('should render a button with accessible label from i18n', () => {
    render(<FAB />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).not.toBe('');
  });

  it('should render with type="button" to prevent form submission', () => {
    render(<FAB />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should be clickable without errors', async () => {
    const user = userEvent.setup();
    render(<FAB />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toBeInTheDocument();
  });

  it('should hide the Plus icon from assistive technology', () => {
    render(<FAB />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
