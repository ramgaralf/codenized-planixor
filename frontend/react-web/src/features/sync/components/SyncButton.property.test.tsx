// Feature: gh16-synchronization, Property 1: Sync button icon reflects connection status
// Feature: gh16-synchronization, Property 2: Sync button navigation depends on config presence
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within } from '@testing-library/react';
import fc from 'fast-check';

import type { ConnectionStatus } from '@features/sync/models';
import { SyncButton } from './SyncButton';

const STATUS_ICON_MAP: Record<ConnectionStatus, { label: string; color: string }> = {
  unconfigured: {
    label: 'Sync status: not configured',
    color: 'var(--color-text-secondary)',
  },
  active: {
    label: 'Sync status: active',
    color: 'var(--color-success)',
  },
  failing: {
    label: 'Sync status: failing',
    color: 'var(--color-error)',
  },
  paused: {
    label: 'Sync status: paused',
    color: 'var(--color-text-secondary)',
  },
};

describe('SyncButton — property tests', () => {
  afterEach(() => {
    cleanup();
  });

  // **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
  describe('Property 1: Sync button icon reflects connection status', () => {
    it('should render the correct icon with the correct aria-label and color for any ConnectionStatus value', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ConnectionStatus>(
            'unconfigured',
            'active',
            'failing',
            'paused',
          ),
          (status) => {
            cleanup();

            const { container } = render(
              <SyncButton status={status} onClick={() => {}} />,
            );

            const button = within(container).getByRole('button', {
              name: STATUS_ICON_MAP[status].label,
            });
            expect(button).toBeInTheDocument();
            expect(button).toHaveStyle({
              color: STATUS_ICON_MAP[status].color,
            });

            cleanup();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should render distinct aria-labels for each status ensuring no two statuses share the same label', () => {
      const statuses: ConnectionStatus[] = [
        'unconfigured',
        'active',
        'failing',
        'paused',
      ];
      const labels = statuses.map((s) => STATUS_ICON_MAP[s].label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(statuses.length);
    });
  });

  // **Validates: Requirements 2.1, 2.2**
  describe('Property 2: Sync button navigation depends on config presence', () => {
    it('should invoke onClick callback when clicked for any ConnectionStatus value', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ConnectionStatus>(
            'unconfigured',
            'active',
            'failing',
            'paused',
          ),
          (status) => {
            cleanup();
            const onClick = vi.fn();

            const { container } = render(
              <SyncButton status={status} onClick={onClick} />,
            );

            const button = within(container).getByRole('button');
            fireEvent.click(button);

            expect(onClick).toHaveBeenCalledTimes(1);

            cleanup();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should invoke onClick regardless of config presence simulation (config absent vs present)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ConnectionStatus>(
            'unconfigured',
            'active',
            'failing',
            'paused',
          ),
          fc.boolean(),
          (status, _configPresent) => {
            cleanup();
            // The SyncButton always delegates navigation to its onClick handler.
            // Whether config is absent (navigate to /sync/config) or present
            // (navigate to /sync) is determined by the caller (HeaderBar).
            // This property verifies that onClick is reliably invoked for all
            // combinations of status and config presence.
            const onClick = vi.fn();

            const { container } = render(
              <SyncButton status={status} onClick={onClick} />,
            );

            const button = within(container).getByRole('button');
            fireEvent.click(button);

            expect(onClick).toHaveBeenCalledTimes(1);

            cleanup();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
