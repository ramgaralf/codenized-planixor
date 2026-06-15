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

/**
 * Formats minutes from midnight to a locale-aware time string (HH:MM).
 * Uses a reference date to produce a time-only representation.
 */
const formatTime = (minutesFromMidnight: number): string => {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Formats total minutes as "Xh Ym".
 */
const formatHoursWorked = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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
      className={`flex items-stretch rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity dark:border-gray-700 dark:bg-gray-800 ${
        shift.isActive ? 'opacity-100' : 'opacity-50'
      }`}
    >
      {/* Left color indicator */}
      <div
        className="w-1 shrink-0 rounded-l-xl"
        style={{ backgroundColor: shift.backgroundColor }}
        aria-hidden="true"
      />

      {/* Content area */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          {/* First line: icon + name + deactivated badge */}
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg">
              {shift.icon}
            </span>
            <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {shift.name}
            </span>
            {!shift.isActive && (
              <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {t('shift.deactivated')}
              </span>
            )}
          </div>

          {/* Second line: start time – end time · hours worked */}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatTime(shift.startTime)} – {formatTime(shift.endTime)} ·{' '}
            {formatHoursWorked(shift.hoursWorked)}
          </p>
        </div>

        {/* Action controls */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(shift.id)}
            aria-label={`${t('shift.actions.edit')} ${shift.name}`}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() =>
              shift.isActive ? onDeactivate(shift.id) : onActivate(shift.id)
            }
            aria-label={`${shift.isActive ? t('shift.actions.deactivate') : t('shift.actions.activate')} ${shift.name}`}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <Power size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(shift.id)}
            aria-label={`${t('shift.actions.delete')} ${shift.name}`}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
