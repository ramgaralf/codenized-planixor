import { useTranslation } from 'react-i18next';

import type { NotificationDisplayItem } from '../hooks/useNotifications';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Formats trigger time as relative (< 24h) or absolute (>= 24h).
 *
 * Relative format: "5 min ago" / "hace 5 min", "2 h ago" / "hace 2 h"
 * Absolute format: locale date-time format
 */
const formatTriggerTime = (triggerTime: Date, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  const now = Date.now();
  const diffMs = now - triggerTime.getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (diffMs < 0 || diffMs >= TWENTY_FOUR_HOURS) {
    // Absolute date-time in device locale
    return triggerTime.toLocaleString();
  }

  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return t('notifications.time.justNow');
  }

  if (diffMinutes < 60) {
    return t('notifications.time.minutesAgo', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return t('notifications.time.hoursAgo', { count: diffHours });
};

/**
 * Returns the localized alert label for a given offset.
 */
const getAlertLabel = (alertOffset: number, t: (key: string) => string): string => {
  switch (alertOffset) {
    case 0:
      return t('notifications.alertLabel.atStart');
    case 10:
      return t('notifications.alertLabel.tenMinutes');
    case 60:
      return t('notifications.alertLabel.oneHour');
    case 1440:
      return t('notifications.alertLabel.oneDay');
    default:
      return '';
  }
};

interface NotificationItemProps {
  item: NotificationDisplayItem;
  onMarkAsRead: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

const NotificationItem = ({ item, onMarkAsRead, t }: NotificationItemProps) => {
  const handleClick = () => {
    onMarkAsRead(item.id);
  };

  return (
    <button
      type="button"
      className="flex items-start gap-3 w-full text-left"
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBlockEnd: '1px solid var(--color-border)',
        cursor: item.isEventDeleted ? 'default' : 'pointer',
        opacity: item.isEventDeleted ? 0.6 : 1,
      }}
      onClick={handleClick}
      aria-label={`${item.eventName} — ${getAlertLabel(item.alertOffset, t)}`}
      aria-disabled={item.isEventDeleted}
    >
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '32px',
          height: '32px',
          fontSize: '18px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
        }}
        aria-hidden="true"
      >
        {item.eventIcon}
      </span>
      <div className="flex flex-col flex-1 overflow-hidden" style={{ gap: '2px' }}>
        <span
          className="truncate"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {item.eventName}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}
        >
          {getAlertLabel(item.alertOffset, t)}
        </span>
      </div>
      <span
        className="flex-shrink-0"
        style={{
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {formatTriggerTime(item.triggerTime, t)}
      </span>
    </button>
  );
};

interface NotificationViewProps {
  /** Callback to close the dropdown */
  onClose: () => void;
}

/**
 * NotificationView — dropdown panel anchored to the bell icon.
 *
 * Displays unread delivered notifications ordered by triggerTime DESC (most recent first).
 * Max height 400px, scrollable. Header with title and "Mark all as read" action.
 * Empty state when no notifications.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7**
 */
export const NotificationView = ({ onClose }: NotificationViewProps) => {
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div
      className="absolute flex flex-col overflow-hidden"
      style={{
        top: '100%',
        right: '0',
        marginTop: '8px',
        width: '360px',
        maxHeight: '400px',
        borderRadius: '12px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
        zIndex: 50,
      }}
      role="dialog"
      aria-label={t('notifications.title')}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {t('notifications.title')}
        </h3>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-primary, #2563EB)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            {t('notifications.markAllAsRead')}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        {notifications.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{
              padding: '32px 16px',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('notifications.empty')}
          </div>
        ) : (
          notifications.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onMarkAsRead={handleMarkAsRead}
              t={t}
            />
          ))
        )}
      </div>

      {/* Invisible close area overlay (clicking outside closes) */}
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0"
        style={{
          zIndex: -1,
          background: 'transparent',
          border: 'none',
          cursor: 'default',
        }}
        aria-label={t('common.cancel')}
        tabIndex={-1}
      />
    </div>
  );
};
