/**
 * NotificationBadge — displays the unread notification count on the bell icon.
 *
 * Display rules:
 * - count === 0: badge is hidden (renders nothing)
 * - 1 <= count <= 99: shows exact number
 * - count > 99: shows "99+"
 *
 * **Validates: Requirements 3.6**
 */

interface NotificationBadgeProps {
  /** Unread notification count */
  count: number;
}

export const NotificationBadge = ({ count }: NotificationBadgeProps) => {
  if (count <= 0) return null;

  const displayText = count > 99 ? '99+' : String(count);

  return (
    <span
      className="absolute flex items-center justify-center rounded-full"
      style={{
        top: '2px',
        right: '2px',
        minWidth: '18px',
        height: '18px',
        padding: '0 4px',
        fontSize: '11px',
        fontWeight: 600,
        lineHeight: 1,
        color: '#ffffff',
        backgroundColor: 'var(--color-error, #EF4444)',
      }}
      aria-label={`${count} unread notifications`}
    >
      {displayText}
    </span>
  );
};
