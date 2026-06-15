import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
          role="status"
          aria-label={t('common.loading')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-error)' }} role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 32px', height: '100%' }}>
      {shifts.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {t(SHIFT_I18N_KEYS.EMPTY)}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            ? t(SHIFT_I18N_KEYS.DELETE_CONFIRM, { name: shifts.find(s => s.id === modal.shiftId)?.name ?? '' })
            : t(SHIFT_I18N_KEYS.DEACTIVATE_CONFIRM, { name: shifts.find(s => s.id === modal.shiftId)?.name ?? '' })
        }
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
};
