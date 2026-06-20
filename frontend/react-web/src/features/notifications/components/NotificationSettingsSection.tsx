import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';

import type { NotificationChannel } from '../types';
import { getChannel, setChannel } from '../services/notificationSettings';
import {
  isSystemPermissionDenied,
  requestSystemPermission,
} from '../services/notificationPermissions';

const CHANNEL_OPTIONS: { value: NotificationChannel; labelKey: string }[] = [
  { value: 'app', labelKey: 'settings.notificationChannelApp' },
  { value: 'system', labelKey: 'settings.notificationChannelSystem' },
  { value: 'both', labelKey: 'settings.notificationChannelBoth' },
];

interface NotificationSettingsSectionProps {
  /** CSS class for the section container */
  sectionClassName?: string;
  /** CSS class for the section title */
  sectionTitleClassName?: string;
  /** CSS class for the option group */
  optionGroupClassName?: string;
  /** CSS class for option labels */
  optionLabelClassName?: string;
  /** CSS class for active option labels */
  optionLabelActiveClassName?: string;
}

export const NotificationSettingsSection = ({
  sectionClassName,
  sectionTitleClassName,
  optionGroupClassName,
  optionLabelClassName,
  optionLabelActiveClassName,
}: NotificationSettingsSectionProps) => {
  const { t } = useTranslation();
  const [channel, setChannelState] = useState<NotificationChannel>('both');
  const [showWarning, setShowWarning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadChannel = async () => {
      const persisted = await getChannel();
      setChannelState(persisted);

      // Check if warning should be shown for current persisted channel
      if (persisted === 'system' || persisted === 'both') {
        setShowWarning(isSystemPermissionDenied());
      }

      setLoaded(true);
    };

    loadChannel();
  }, []);

  const handleChannelChange = useCallback(async (newChannel: NotificationChannel) => {
    // If selecting "System" or "Both", request permission first
    if (newChannel === 'system' || newChannel === 'both') {
      const result = await requestSystemPermission();

      if (!result.granted) {
        // Permission denied — revert to "App" and show warning (atomic operation)
        setChannelState('app');
        setShowWarning(true);
        await setChannel('app');
        return;
      }

      // Permission granted — proceed
      setShowWarning(false);
    } else {
      // "App" selected — no permission needed, clear warning
      setShowWarning(false);
    }

    setChannelState(newChannel);
    await setChannel(newChannel);
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <section className={sectionClassName}>
      <h2 className={sectionTitleClassName}>{t('settings.notifications')}</h2>
      <div
        className={optionGroupClassName}
        role="radiogroup"
        aria-label={t('settings.notifications')}
      >
        {CHANNEL_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`${optionLabelClassName ?? ''} ${channel === option.value ? (optionLabelActiveClassName ?? '') : ''}`}
          >
            <input
              type="radio"
              name="notificationChannel"
              value={option.value}
              checked={channel === option.value}
              onChange={() => handleChannelChange(option.value)}
            />
            {t(option.labelKey)}
          </label>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          marginTop: '12px',
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
          fontSize: '0.8125rem',
          lineHeight: '1.4',
        }}
        role="note"
      >
        <Info
          size={16}
          aria-hidden="true"
          style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '1px' }}
        />
        <span>{t('settings.notificationWebLimitation')}</span>
      </div>

      {showWarning && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.8125rem',
            lineHeight: '1.4',
          }}
        >
          <AlertTriangle
            size={16}
            aria-hidden="true"
            style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '1px' }}
          />
          <span>{t('settings.notificationPermissionWarning')}</span>
        </div>
      )}
    </section>
  );
};
