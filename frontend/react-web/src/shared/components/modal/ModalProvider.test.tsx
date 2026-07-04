import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/infrastructure/i18n';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <ModalProvider>{children}</ModalProvider>
  </I18nextProvider>
);

const TestTrigger = ({
  type = 'info',
  titleKey = 'app.name',
  messageKey = 'app.description',
  onConfirm,
  onCancel,
  messageParams,
}: {
  type?: 'info' | 'error' | 'confirm';
  titleKey?: string;
  messageKey?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  messageParams?: Record<string, string>;
}) => {
  const { show } = useModal();
  return (
    <button
      onClick={() =>
        show({ type, titleKey, messageKey, onConfirm, onCancel, messageParams })
      }
    >
      Open Modal
    </button>
  );
};

describe('ModalProvider', () => {
  it('should render children without a modal initially', () => {
    render(
      <Wrapper>
        <p>Content</p>
      </Wrapper>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show an info modal when triggered', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="info" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Planixor')).toBeInTheDocument();
  });

  it('should show a confirm modal when triggered', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="confirm" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('should show an error modal with error title styling', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="error" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));

    const title = screen.getByText('Planixor');
    expect(title).toHaveStyle({ color: 'var(--color-error)' });
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Wrapper>
        <TestTrigger type="confirm" titleKey="app.name" messageKey="app.description" onConfirm={onConfirm} />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('should call onCancel when cancel button is clicked on confirm modal', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <Wrapper>
        <TestTrigger type="confirm" titleKey="app.name" messageKey="app.description" onCancel={onCancel} />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should dismiss info modal on overlay click', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="info" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click overlay (presentation div)
    const overlay = screen.getByRole('presentation');
    await user.click(overlay);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should dismiss info modal on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="info" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should NOT dismiss confirm modal on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="confirm" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // Modal should still be visible
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('should NOT dismiss confirm modal on overlay click', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger type="confirm" titleKey="app.name" messageKey="app.description" />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    // Click overlay — confirm modal overlay does not have click handler
    const overlay = screen.getByRole('presentation');
    await user.click(overlay);

    // Modal should still be visible
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('should queue multiple modals and show them in FIFO order', async () => {
    const user = userEvent.setup();

    const MultiTrigger = () => {
      const { show } = useModal();
      return (
        <button
          onClick={() => {
            show({ type: 'info', titleKey: 'nav.calendar', messageKey: 'app.description' });
            show({ type: 'info', titleKey: 'nav.shifts', messageKey: 'app.description' });
            show({ type: 'info', titleKey: 'nav.reminders', messageKey: 'app.description' });
          }}
        >
          Open Three
        </button>
      );
    };

    render(
      <Wrapper>
        <MultiTrigger />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Three'));

    // First modal should be visible
    expect(screen.getByText('Calendar')).toBeInTheDocument();

    // Dismiss via Escape
    await user.keyboard('{Escape}');

    // Second modal should appear
    await waitFor(() => {
      expect(screen.getByText('Shifts')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    // Third modal should appear
    await waitFor(() => {
      expect(screen.getByText('Reminders')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    // No more modals
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should interpolate messageParams in modal message', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <TestTrigger
          type="confirm"
          titleKey="shift.delete.title"
          messageKey="shift.delete.confirm"
          messageParams={{ name: 'Morning' }}
        />
      </Wrapper>,
    );

    await user.click(screen.getByText('Open Modal'));

    expect(screen.getByText(/Morning/)).toBeInTheDocument();
  });
});
