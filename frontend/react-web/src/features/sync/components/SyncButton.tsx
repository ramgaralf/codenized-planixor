import { Cloud, CloudOff, PauseCircle } from 'lucide-react';

import type { ConnectionStatus } from '@features/sync/models';

interface SyncButtonProps {
  status: ConnectionStatus;
  onClick: () => void;
}

const STATUS_ICON_MAP: Record<
  ConnectionStatus,
  { icon: typeof Cloud; color: string; label: string }
> = {
  unconfigured: {
    icon: CloudOff,
    color: 'var(--color-text-secondary)',
    label: 'Sync status: not configured',
  },
  active: {
    icon: Cloud,
    color: 'var(--color-success)',
    label: 'Sync status: active',
  },
  failing: {
    icon: CloudOff,
    color: 'var(--color-error)',
    label: 'Sync status: failing',
  },
  paused: {
    icon: PauseCircle,
    color: 'var(--color-text-secondary)',
    label: 'Sync status: paused',
  },
};

export const SyncButton = ({ status, onClick }: SyncButtonProps) => {
  const { icon: Icon, color, label } = STATUS_ICON_MAP[status];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        minWidth: '44px',
        minHeight: '44px',
        border: 'none',
        borderRadius: '50%',
        backgroundColor: 'transparent',
        color,
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
};
