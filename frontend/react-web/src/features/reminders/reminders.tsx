import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { REMINDER_I18N_KEYS } from '@features/reminders/constants';
import { ReminderCard } from '@features/reminders/components/ReminderCard';
import { ConfirmationModal } from '@features/shifts/components/ConfirmationModal';
import { useReminders } from '@features/reminders/hooks/useReminders';
import * as reminderService from '@features/reminders/services/reminderService';

type ModalAction = 'deactivate' | 'delete';

interface ModalState {
  isOpen: boolean;
  action: ModalAction | null;
  reminderId: string | null;
}

const INITIAL_MODAL_STATE: ModalState = {
  isOpen: false,
  action: null,
  reminderId: null,
};

export const RemindersContainer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { reminders, isLoading, error, deactivate, activate, softDelete } = useReminders();
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL_STATE);

  const handleEdit = useCallback(
    async (id: string) => {
      try {
        const reminder = await reminderService.getById(id);
        if (!reminder || reminder.isDeleted) {
          navigate('/reminders', { replace: true });
          return;
        }
        navigate(`/reminders/${id}/edit`);
      } catch {
        navigate('/reminders', { replace: true });
      }
    },
    [navigate],
  );

  const handleDeactivate = useCallback((id: string) => {
    setModal({ isOpen: true, action: 'deactivate', reminderId: id });
  }, []);

  const handleActivate = useCallback(
    async (id: string) => {
      await activate(id);
    },
    [activate],
  );

  const handleDelete = useCallback((id: string) => {
    setModal({ isOpen: true, action: 'delete', reminderId: id });
  }, []);

  const handleModalConfirm = useCallback(async () => {
    if (!modal.reminderId || !modal.action) return;

    const { reminderId, action } = modal;
    setModal(INITIAL_MODAL_STATE);

    if (action === 'deactivate') {
      await deactivate(reminderId);
    } else if (action === 'delete') {
      await softDelete(reminderId);
    }
  }, [modal, deactivate, softDelete]);

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
      {reminders.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {t(REMINDER_I18N_KEYS.EMPTY)}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
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
            ? t('reminder.delete.title')
            : t('reminder.deactivate.title')
        }
        message={
          modal.action === 'delete'
            ? t(REMINDER_I18N_KEYS.DELETE_CONFIRM, {
                name: reminders.find((r) => r.id === modal.reminderId)?.name ?? '',
              })
            : t(REMINDER_I18N_KEYS.DEACTIVATE_CONFIRM, {
                name: reminders.find((r) => r.id === modal.reminderId)?.name ?? '',
              })
        }
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
};
