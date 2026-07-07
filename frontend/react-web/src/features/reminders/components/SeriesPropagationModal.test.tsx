import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SeriesPropagationModal } from './SeriesPropagationModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'reminder.propagation.series.title': 'Frequency Changed',
        'reminder.propagation.series.description': `The repetition frequency has changed from "${params?.previousFrequency ?? ''}" to "${params?.newFrequency ?? ''}". ${params?.count ?? 0} calendar event(s) for this year may be affected.`,
        'reminder.propagation.series.confirm': 'Update events',
        'reminder.propagation.series.decline': 'Keep existing',
      };
      return translations[key] ?? key;
    },
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

describe('SeriesPropagationModal', () => {
  const defaultProps = {
    isOpen: true,
    reminderName: 'Take Medicine',
    previousFrequency: 'Every week',
    newFrequency: 'Every month',
    affectedEventCount: 12,
    onConfirm: vi.fn(),
    onDecline: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title, description with frequency values and affected count when isOpen is true', () => {
    render(<SeriesPropagationModal {...defaultProps} />);

    expect(screen.getByText('Frequency Changed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The repetition frequency has changed from "Every week" to "Every month". 12 calendar event(s) for this year may be affected.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep existing/i })).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<SeriesPropagationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Frequency Changed')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<SeriesPropagationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Update events/i }));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDecline).not.toHaveBeenCalled();
  });

  it('should call onDecline when decline button is clicked', async () => {
    const user = userEvent.setup();
    render(<SeriesPropagationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Keep existing/i }));

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should call onDecline when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<SeriesPropagationModal {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should call onDecline when clicking outside the modal (overlay)', async () => {
    const user = userEvent.setup();
    render(<SeriesPropagationModal {...defaultProps} />);

    const overlay = screen.getByRole('dialog').parentElement!;
    await user.click(overlay);

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should have role="dialog", aria-modal="true", and aria-labelledby pointing to the title', () => {
    render(<SeriesPropagationModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'series-propagation-modal-title');

    const title = screen.getByText('Frequency Changed');
    expect(title).toHaveAttribute('id', 'series-propagation-modal-title');
  });

  it('should display different frequency values when changed from never to yearly', () => {
    render(
      <SeriesPropagationModal
        {...defaultProps}
        previousFrequency="Never"
        newFrequency="Every year"
        affectedEventCount={3}
      />,
    );

    expect(
      screen.getByText(
        'The repetition frequency has changed from "Never" to "Every year". 3 calendar event(s) for this year may be affected.',
      ),
    ).toBeInTheDocument();
  });
});
