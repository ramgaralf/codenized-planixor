import { useTranslation } from 'react-i18next';

import { useTheme } from '@context/useTheme';
import type { ThemeMode } from '@context/ThemeContextValue';

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

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className={styles.settingsPage}>
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
    </div>
  );
};
