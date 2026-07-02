import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmationModal } from './ConfirmationModal';

// Mock HTMLDialogElement methods not available in jsdom
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

const defaultProps = {
  isOpen: true,
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  confirmLabel: 'Yes, confirm',
  cancelLabel: 'No, cancel',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmationModal', () => {
  it('should render the title and message when open', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('should render confirm and cancel buttons with provided labels', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Yes, confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, cancel' })).toBeInTheDocument();
  });

  it('should not render anything when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Yes, confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'No, cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();

    render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />);

    const dialog = screen.getByRole('dialog');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: dialog });
    dialog.dispatchEvent(clickEvent);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not call onCancel when clicking inside the modal content', () => {
    const onCancel = vi.fn();

    render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />);

    const title = screen.getByText('Confirm Action');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: title });
    title.dispatchEvent(clickEvent);

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when native cancel event is triggered (escape key)', () => {
    const onCancel = vi.fn();

    render(<ConfirmationModal {...defaultProps} onCancel={onCancel} />);

    const dialog = screen.getByRole('dialog');
    const cancelEvent = new Event('cancel', { bubbles: true, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should have proper accessibility attributes', () => {
    render(<ConfirmationModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirmation-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'confirmation-modal-message');
  });

  it('should call showModal when opened', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });
});
