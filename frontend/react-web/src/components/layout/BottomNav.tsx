import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Calendar, Clock, Bell, BarChart3, Settings } from 'lucide-react';

import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  { to: '/', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { to: '/shifts', icon: Clock, labelKey: 'nav.shifts' },
  { to: '/reminders', icon: Bell, labelKey: 'nav.reminders' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
] as const;

export const BottomNav = () => {
  const { t } = useTranslation();

  return (
    <nav
      className={styles.bottomNav}
      role="navigation"
      aria-label={t('accessibility.mainNavigation')}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <Icon className={styles.navIcon} aria-hidden="true" />
          <span className={styles.navLabel}>{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
};
