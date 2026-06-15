import { useTranslation } from 'react-i18next';
import { Pencil, Power, Trash2 } from 'lucide-react';
import type { Shift } from '../models';

interface ShiftCardProps {
  shift: Shift;
  onEdit: (id: string) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatTime = (minutesFromMidnight: number): string => {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatHoursWorked = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

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

export const ShiftCard = ({
  shift,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
}: ShiftCardProps) => {
  const { t } = useTranslation();

  return (
    <article
      aria-label={shift.name}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        opacity: shift.isActive ? 1 : 0.5,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Left color indicator */}
      <div
        style={{
          width: '8px',
          flexShrink: 0,
          borderRadius: '12px 0 0 12px',
          backgroundColor: shift.backgroundColor,
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
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* First line: icon + name + deactivated badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden="true" style={{ fontSize: '18px' }}>
              {shift.icon}
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
              {shift.name}
            </span>
            {!shift.isActive && (
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
                {t('shift.deactivated')}
              </span>
            )}
          </div>

          {/* Second line: times + hours worked */}
          <p
            style={{
              marginTop: '4px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              margin: '4px 0 0 0',
            }}
          >
            {formatTime(shift.startTime)} – {formatTime(shift.endTime)} ·{' '}
            {formatHoursWorked(shift.hoursWorked)}
          </p>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onEdit(shift.id)}
            aria-label={`${t('shift.actions.edit')} ${shift.name}`}
            style={actionBtnStyle}
          >
            <Pencil size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() =>
              shift.isActive ? onDeactivate(shift.id) : onActivate(shift.id)
            }
            aria-label={`${shift.isActive ? t('shift.actions.deactivate') : t('shift.actions.activate')} ${shift.name}`}
            style={actionBtnStyle}
          >
            <Power size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(shift.id)}
            aria-label={`${t('shift.actions.delete')} ${shift.name}`}
            style={{ ...actionBtnStyle, color: 'var(--color-error)' }}
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
