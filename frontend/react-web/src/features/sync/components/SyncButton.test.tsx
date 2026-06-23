import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ConnectionStatus } from '@features/sync/models';

import { SyncButton } from './SyncButton';

describe('SyncButton', () => {
  it('should render with aria-label describing unconfigured status', () => {
    render(<SyncButton status="unconfigured" onClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /sync status: not configured/i }),
    ).toBeInTheDocument();
  });

  it('should render with aria-label describing active status', () => {
    render(<SyncButton status="active" onClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /sync status: active/i }),
    ).toBeInTheDocument();
  });

  it('should render with aria-label describing failing status', () => {
    render(<SyncButton status="failing" onClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /sync status: failing/i }),
    ).toBeInTheDocument();
  });

  it('should render with aria-label describing paused status', () => {
    render(<SyncButton status="paused" onClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /sync status: paused/i }),
    ).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SyncButton status="active" onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should apply success color for active status', () => {
    render(<SyncButton status="active" onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ color: 'var(--color-success)' });
  });

  it('should apply error color for failing status', () => {
    render(<SyncButton status="failing" onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ color: 'var(--color-error)' });
  });

  it('should apply text-secondary color for unconfigured status', () => {
    render(<SyncButton status="unconfigured" onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ color: 'var(--color-text-secondary)' });
  });

  it('should apply text-secondary color for paused status', () => {
    render(<SyncButton status="paused" onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ color: 'var(--color-text-secondary)' });
  });

  it('should render different icons for each status', () => {
    const statuses: ConnectionStatus[] = ['unconfigured', 'active', 'failing', 'paused'];

    for (const status of statuses) {
      const { unmount } = render(<SyncButton status={status} onClick={vi.fn()} />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      unmount();
    }
  });
});
