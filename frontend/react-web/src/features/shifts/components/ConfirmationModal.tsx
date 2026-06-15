import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        onCancel();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto w-full max-w-sm rounded-[16px] border-0 bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06)] backdrop:bg-black/50 dark:bg-[#1A2035]"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
      onCancel={handleCancel}
    >
      <div className="flex flex-col gap-4">
        <h2
          id="confirmation-modal-title"
          className="text-lg font-semibold text-[#1A1F3D] dark:text-white"
        >
          {title}
        </h2>
        <p
          id="confirmation-modal-message"
          className="text-sm text-[#6B7280] dark:text-[#9CA3AF]"
        >
          {message}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-[#F3F4F6] dark:border-[#2D3748] dark:text-[#9CA3AF] dark:hover:bg-[#232B3E]"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
