import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Calendar, Clock, Bell, BarChart3, Settings } from 'lucide-react';

import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { to: '/shifts', icon: Clock, labelKey: 'nav.shifts' },
  { to: '/reminders', icon: Bell, labelKey: 'nav.reminders' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
] as const;

export const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon} aria-hidden="true">P</span>
        <span className={styles.logoText}>Planixor</span>
      </div>

      <nav
        className={styles.nav}
        role="navigation"
        aria-label={t('accessibility.mainNavigation')}
      >
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <Icon className={styles.navIcon} aria-hidden="true" />
            <span className={styles.navLabel}>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
