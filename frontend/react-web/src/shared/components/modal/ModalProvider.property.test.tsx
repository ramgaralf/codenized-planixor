/**
 * Property-based tests for modal queue ordering (Property 10).
 * Feature: gh32-improvements-and-bug-fixes
 *
 * Property 10: Modal queue ordering — for any sequence of N triggers,
 * modals display one at a time in FIFO order.
 *
 * **Validates: Requirements 10.7**
 */
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import fc from 'fast-check';

import i18n from '@/infrastructure/i18n';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';
import type { ModalConfig } from './ModalContextValue';

const MODAL_TYPES = ['info', 'error', 'confirm'] as const;

/**
 * Arbitrary for modal type.
 */
const arbModalType = fc.constantFrom(...MODAL_TYPES);

/**
 * Generates a sequence of 1–10 modal configs with indexed titles for identification.
 */
const arbModalSequence = fc
  .array(arbModalType, { minLength: 1, maxLength: 10 })
  .map((types) =>
    types.map((type, index) => ({
      type,
      titleKey: `modal-title-${index}`,
      messageKey: 'app.description',
    })),
  );

/** Wrapper providing i18n and ModalProvider context. */
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <ModalProvider>{children}</ModalProvider>
  </I18nextProvider>
);

/**
 * Test component that exposes a trigger to show all modals in sequence.
 */
const QueueTestHarness = ({ configs }: { configs: ModalConfig[] }) => {
  const { show, dismiss } = useModal();

  const handleShowAll = () => {
    for (const config of configs) {
      show(config);
    }
  };

  return (
    <div>
      <button onClick={handleShowAll} data-testid="show-all">
        Show All
      </button>
      <button onClick={dismiss} data-testid="dismiss-current">
        Dismiss
      </button>
    </div>
  );
};

describe('ModalProvider — property tests', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 10: Modal queue ordering
   *
   * For any sequence of N modal triggers (1-10 modals with random types: info/error/confirm),
   * modals display one at a time in FIFO order.
   *
   * - Show all N modals via show() in sequence
   * - Verify: only 1 modal visible at a time
   * - Dismiss current → next one appears (in the same order they were triggered)
   * - After dismissing all N → no modals visible
   *
   * **Validates: Requirements 10.7**
   */
  describe('Property 10: Modal queue ordering', () => {
    it('for any sequence of N triggers, modals display one at a time in FIFO order', async () => {
      await fc.assert(
        fc.asyncProperty(arbModalSequence, async (configs) => {
          cleanup();

          render(
            <Wrapper>
              <QueueTestHarness configs={configs} />
            </Wrapper>,
          );

          const showAllButton = screen.getByTestId('show-all');

          // Trigger all modals in sequence via a single click
          await act(async () => {
            fireEvent.click(showAllButton);
          });

          // Walk through each modal in FIFO order
          for (let i = 0; i < configs.length; i++) {
            const expectedTitle = `modal-title-${i}`;
            const config = configs[i];

            // Verify the correct modal is visible (by title text)
            // i18n returns the key as-is when no translation is found
            await waitFor(() => {
              expect(screen.getByText(expectedTitle)).toBeInTheDocument();
            });

            // Verify only ONE modal is visible at a time
            const dialogRole =
              config.type === 'confirm' ? 'alertdialog' : 'dialog';
            const dialogs = screen.getAllByRole(dialogRole);
            expect(dialogs).toHaveLength(1);

            // Ensure the OTHER type of dialog is not present
            const otherRole =
              config.type === 'confirm' ? 'dialog' : 'alertdialog';
            expect(screen.queryByRole(otherRole)).not.toBeInTheDocument();

            // Dismiss the current modal appropriately
            if (config.type === 'confirm') {
              // Confirm modals require explicit button to dismiss
              const cancelButton = screen.getByRole('button', {
                name: /cancel/i,
              });
              await act(async () => {
                fireEvent.click(cancelButton);
              });
            } else {
              // Info/error modals: use the dismiss button from harness
              // (equivalent to overlay click or Escape)
              const dismissButton = screen.getByTestId('dismiss-current');
              await act(async () => {
                fireEvent.click(dismissButton);
              });
            }
          }

          // After dismissing all N modals, no modals should be visible
          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
          });

          cleanup();
        }),
        { numRuns: 100 },
      );
    }, 60_000);
  });
});
