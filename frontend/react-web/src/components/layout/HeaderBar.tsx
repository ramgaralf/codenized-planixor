import { useTranslation } from 'react-i18next';
import { Bell, Plus, User } from 'lucide-react';

import styles from './HeaderBar.module.css';

export const HeaderBar = () => {
  const { t } = useTranslation();

  return (
    <header className={styles.headerBar}>
      <div className={styles.mobileLogo}>
        <span className={styles.mobileLogoIcon} aria-hidden="true">P</span>
        <span className={styles.mobileLogoText}>Planixor</span>
      </div>

      <button
        className={styles.iconButton}
        type="button"
        aria-label={t('accessibility.notifications')}
      >
        <Bell size={20} aria-hidden="true" />
      </button>

      <button
        className={styles.newEventButton}
        type="button"
      >
        <Plus size={16} aria-hidden="true" />
        {t('actions.newEvent')}
      </button>

      <button
        className={styles.userAvatar}
        type="button"
        aria-label={t('accessibility.userMenu')}
      >
        <User size={20} aria-hidden="true" />
      </button>
    </header>
  );
};
