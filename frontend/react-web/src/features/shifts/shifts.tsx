import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { SHIFT_I18N_KEYS } from '@features/shifts/constants';
import { ShiftCard } from '@features/shifts/components/ShiftCard';
import { ConfirmationModal } from '@features/shifts/components/ConfirmationModal';
import * as shiftService from '@features/shifts/services/shiftService';
import type { Shift } from '@features/shifts/models';

type ModalAction = 'deactivate' | 'delete';

interface ModalState {
  isOpen: boolean;
  action: ModalAction | null;
  shiftId: string | null;
}

const INITIAL_MODAL_STATE: ModalState = {
  isOpen: false,
  action: null,
  shiftId: null,
};

export const ShiftsContainer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL_STATE);

  useEffect(() => {
    const loadShifts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await shiftService.getAll();
        setShifts(result);
      } catch (err) {
        console.error('Failed to load shifts:', err);
        setError(t(SHIFT_I18N_KEYS.ERROR_LOAD_FAILED));
      } finally {
        setIsLoading(false);
      }
    };

    loadShifts();
  }, [t]);

  const handleEdit = useCallback(
    async (id: string) => {
      try {
        const shift = await shiftService.getById(id);
        if (!shift || shift.isDeleted) {
          navigate('/shifts', { replace: true });
          return;
        }
        navigate(`/shifts/${id}/edit`);
      } catch {
        navigate('/shifts', { replace: true });
      }
    },
    [navigate],
  );

  const handleDeactivate = useCallback((id: string) => {
    setModal({ isOpen: true, action: 'deactivate', shiftId: id });
  }, []);

  const handleActivate = useCallback(async (id: string) => {
    try {
      await shiftService.activate(id);
      setShifts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: true, modifiedAt: new Date() } : s)),
      );
    } catch (err) {
      console.error('Failed to activate shift:', err);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    setModal({ isOpen: true, action: 'delete', shiftId: id });
  }, []);

  const handleModalConfirm = useCallback(async () => {
    if (!modal.shiftId || !modal.action) return;

    const { shiftId, action } = modal;
    setModal(INITIAL_MODAL_STATE);

    try {
      if (action === 'deactivate') {
        await shiftService.deactivate(shiftId);
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shiftId ? { ...s, isActive: false, modifiedAt: new Date() } : s,
          ),
        );
      } else if (action === 'delete') {
        await shiftService.softDelete(shiftId);
        setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      }
    } catch (err) {
      console.error(`Failed to ${action} shift:`, err);
    }
  }, [modal]);

  const handleModalCancel = useCallback(() => {
    setModal(INITIAL_MODAL_STATE);
  }, []);

  const handleNewShift = useCallback(() => {
    navigate('/shifts/new');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#2563EB] dark:border-[#2D3748] dark:border-t-[#3B82F6]"
          role="status"
          aria-label={t('common.loading')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-[#EF4444] dark:text-[#F87171]" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleNewShift}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
        >
          <Plus size={16} aria-hidden="true" />
          {t('shift.newShift')}
        </button>
      </div>

      {shifts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            {t(SHIFT_I18N_KEYS.EMPTY)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              onActivate={handleActivate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={modal.isOpen}
        title={
          modal.action === 'delete'
            ? t('shift.delete.title')
            : t('shift.deactivate.title')
        }
        message={
          modal.action === 'delete'
            ? t(SHIFT_I18N_KEYS.DELETE_CONFIRM)
            : t(SHIFT_I18N_KEYS.DEACTIVATE_CONFIRM)
        }
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
};
