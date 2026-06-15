import { useTranslation } from 'react-i18next';
import { Pencil, Play, Pause, Trash2 } from 'lucide-react';
import type { Reminder } from '../models';

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (id: string) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '44px',
  height: '44px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

export const ReminderCard = ({
  reminder,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
}: ReminderCardProps) => {
  const { t } = useTranslation();

  return (
    <article
      aria-label={reminder.name}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        opacity: reminder.isActive ? 1 : 0.5,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Left color indicator — 8dp wide strip */}
      <div
        style={{
          width: '8px',
          flexShrink: 0,
          borderRadius: '12px 0 0 12px',
          backgroundColor: reminder.backgroundColor,
        }}
        aria-hidden="true"
      />

      {/* Content area */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
        }}
      >
        {/* First line: icon + name + deactivated badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span aria-hidden="true" style={{ fontSize: '18px', flexShrink: 0 }}>
            {reminder.icon}
          </span>
          <span
            style={{
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {reminder.name}
          </span>
          {!reminder.isActive && (
            <span
              style={{
                flexShrink: 0,
                borderRadius: '9999px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('reminder.badge.deactivated')}
            </span>
          )}
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onEdit(reminder.id)}
            aria-label={`${t('reminder.actions.edit')} ${reminder.name}`}
            style={actionBtnStyle}
          >
            <Pencil size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() =>
              reminder.isActive ? onDeactivate(reminder.id) : onActivate(reminder.id)
            }
            aria-label={`${reminder.isActive ? t('reminder.actions.deactivate') : t('reminder.actions.activate')} ${reminder.name}`}
            style={actionBtnStyle}
          >
            {reminder.isActive ? (
              <Pause size={20} aria-hidden="true" />
            ) : (
              <Play size={20} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(reminder.id)}
            aria-label={`${t('reminder.actions.delete')} ${reminder.name}`}
            style={{ ...actionBtnStyle, color: 'var(--color-error)' }}
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
