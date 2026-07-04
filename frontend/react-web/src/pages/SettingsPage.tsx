import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@context/useTheme';
import type { ThemeMode } from '@context/ThemeContextValue';
import { db } from '@/data/db';
import { NotificationSettingsSection } from '@features/notifications/components/NotificationSettingsSection';
import { ShiftModeSection } from '@features/shift-mode/components/ShiftModeSection';
import { Backup } from '@features/backup/backup';
import { useModal } from '@shared/components/modal/useModal';

import styles from './SettingsPage.module.css';

const THEME_OPTIONS: { value: ThemeMode; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
  { value: 'system', labelKey: 'settings.themeSystem' },
];

const LANGUAGE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'es', labelKey: 'settings.languageEs' },
  { value: 'en', labelKey: 'settings.languageEn' },
];

export const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useTheme();
  const [isResetting, setIsResetting] = useState(false);
  const { show } = useModal();

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  const handleResetApp = useCallback(() => {
    show({
      type: 'confirm',
      titleKey: 'settings.resetConfirmTitle',
      messageKey: 'settings.resetConfirmMessage',
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await db.calendarEvents.clear();
          await db.shifts.clear();
          await db.reminders.clear();
          await db.annualHoursConfig.clear();
          await db.notifications.clear();
          await db.notificationSettings.clear();
          await db.syncConfig.clear();

          window.location.reload();
        } catch (e) {
          console.error('Reset failed:', e);
          setIsResetting(false);
        }
      },
    });
  }, [show]);

  return (
    <div className={styles.settingsPage}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.userManual')}</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
          {t('settings.userManualDescription')}
        </p>
        <a
          href="https://planixor.codenized.com/help"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          {t('settings.userManualButton')}
        </a>
      </section>

      <ShiftModeSection
        sectionClassName={styles.section}
        sectionTitleClassName={styles.sectionTitle}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.theme')}</h2>
        <div className={styles.optionGroup} role="radiogroup" aria-label={t('settings.theme')}>
          {THEME_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`${styles.optionLabel} ${mode === option.value ? styles.optionLabelActive : ''}`}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={mode === option.value}
                onChange={() => handleThemeChange(option.value)}
              />
              {t(option.labelKey)}
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.language')}</h2>
        <div className={styles.optionGroup} role="radiogroup" aria-label={t('settings.language')}>
          {LANGUAGE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`${styles.optionLabel} ${i18n.language === option.value ? styles.optionLabelActive : ''}`}
            >
              <input
                type="radio"
                name="language"
                value={option.value}
                checked={i18n.language === option.value}
                onChange={() => handleLanguageChange(option.value)}
              />
              {t(option.labelKey)}
            </label>
          ))}
        </div>
      </section>

      <NotificationSettingsSection
        sectionClassName={styles.section}
        sectionTitleClassName={styles.sectionTitle}
        optionGroupClassName={styles.optionGroup}
        optionLabelClassName={styles.optionLabel}
        optionLabelActiveClassName={styles.optionLabelActive}
      />

      <section className={styles.section}>
        <Backup />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.dangerZone')}</h2>
        <p className={styles.resetDescription}>{t('settings.resetDescription')}</p>
        <button
          type="button"
          className={styles.resetButton}
          onClick={handleResetApp}
          disabled={isResetting}
        >
          {isResetting ? t('common.loading') : t('settings.resetButton')}
        </button>
      </section>

      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontWeight: 500,
          textAlign: 'center',
          marginTop: '32px',
        }}
      >
        v{__APP_VERSION__}
      </p>
    </div>
  );
};
