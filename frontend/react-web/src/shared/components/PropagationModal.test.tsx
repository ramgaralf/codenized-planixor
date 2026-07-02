import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PropagationModal } from './PropagationModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'propagation.modal.title': 'Update Calendar Events',
        'propagation.modal.description.shift': `The shift "${params?.name ?? ''}" has been modified. Do you want to update all affected calendar events for ${params?.year ?? ''}?`,
        'propagation.modal.description.reminder': `The reminder "${params?.name ?? ''}" has been modified. Do you want to update all affected calendar events for ${params?.year ?? ''}?`,
        'propagation.modal.affectedCount': `${params?.count ?? 0} event(s) will be updated`,
        'propagation.modal.confirm': 'Update',
        'propagation.modal.decline': 'Skip',
      };
      return translations[key] ?? key;
    },
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

describe('PropagationModal', () => {
  const defaultProps = {
    isOpen: true,
    templateName: 'Morning Shift',
    templateType: 'shift' as const,
    affectedEventCount: 5,
    onConfirm: vi.fn(),
    onDecline: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title, description, affected count, and buttons when isOpen is true and templateType is shift', () => {
    render(<PropagationModal {...defaultProps} />);

    expect(screen.getByText('Update Calendar Events')).toBeInTheDocument();
    expect(
      screen.getByText(
        `The shift "Morning Shift" has been modified. Do you want to update all affected calendar events for ${new Date().getFullYear()}?`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('5 event(s) will be updated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('should render description for reminder type when templateType is reminder', () => {
    render(<PropagationModal {...defaultProps} templateType="reminder" templateName="Take Medicine" />);

    expect(
      screen.getByText(
        `The reminder "Take Medicine" has been modified. Do you want to update all affected calendar events for ${new Date().getFullYear()}?`,
      ),
    ).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<PropagationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Update Calendar Events')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<PropagationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDecline).not.toHaveBeenCalled();
  });

  it('should call onDecline when decline button is clicked', async () => {
    const user = userEvent.setup();
    render(<PropagationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should call onDecline when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<PropagationModal {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should call onDecline when clicking outside the modal (overlay)', async () => {
    const user = userEvent.setup();
    render(<PropagationModal {...defaultProps} />);

    // Click on the overlay (the parent of the dialog element)
    const overlay = screen.getByRole('dialog').parentElement!;
    await user.click(overlay);

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should have role="dialog", aria-modal="true", and aria-labelledby pointing to the title', () => {
    render(<PropagationModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'propagation-modal-title');

    // Verify the title element has the matching id
    const title = screen.getByText('Update Calendar Events');
    expect(title).toHaveAttribute('id', 'propagation-modal-title');
  });
});
