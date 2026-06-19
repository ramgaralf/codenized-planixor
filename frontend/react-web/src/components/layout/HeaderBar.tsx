import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Plus, Settings, User } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';
import { useReportsStore } from '@/stores/reportsStore';

import styles from './HeaderBar.module.css';

const getPageTitleKey = (pathname: string): string => {
  if (pathname === '/') return 'nav.calendar';
  if (pathname === '/reports') return 'nav.reports';
  if (pathname.startsWith('/shifts')) return 'nav.shifts';
  if (pathname.startsWith('/reminders')) return 'nav.reminders';
  if (pathname === '/settings') return 'settings.title';
  return 'nav.calendar';
};

export const HeaderBar = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const openCreateForm = useCalendarStore((state) => state.openCreateForm);
  const reportMode = useReportsStore((state) => state.mode);
  const openConfigModal = useReportsStore((state) => state.openConfigModal);
  const pageTitle = t(getPageTitleKey(pathname));
  const isCalendar = pathname === '/';
  const isShiftsList = pathname === '/shifts';
  const isRemindersList = pathname === '/reminders';
  const isReports = pathname === '/reports';
  const showAnnualConfigButton = isReports && reportMode === 'year';

  return (
    <header className={styles.headerBar}>
      <div className={styles.mobileLogo}>
        <span className={styles.mobileLogoIcon} aria-hidden="true">P</span>
        <span className={styles.mobileLogoText}>Planixor</span>
      </div>

      <span className={styles.pageTitle}>{pageTitle}</span>

      <div className={styles.actions}>
        {isCalendar && (
          <button
            className={styles.newEventButton}
            type="button"
            onClick={openCreateForm}
          >
            <Plus size={16} aria-hidden="true" />
            {t('actions.newEvent')}
          </button>
        )}

        {isShiftsList && (
          <button
            className={styles.newEventButton}
            type="button"
            onClick={() => navigate('/shifts/new')}
          >
            <Plus size={16} aria-hidden="true" />
            {t('shift.newShift')}
          </button>
        )}

        {isRemindersList && (
          <button
            className={styles.newEventButton}
            type="button"
            onClick={() => navigate('/reminders/new')}
          >
            <Plus size={16} aria-hidden="true" />
            {t('reminder.newReminder')}
          </button>
        )}

        {showAnnualConfigButton && (
          <button
            className={styles.newEventButton}
            type="button"
            onClick={openConfigModal}
            aria-label={t('reports.annualConfig.button', { defaultValue: 'Annual hours configuration' })}
          >
            <Settings size={16} aria-hidden="true" />
            {t('reports.annualConfig.button', { defaultValue: 'Annual config' })}
          </button>
        )}

        <button
          className={styles.iconButton}
          type="button"
          aria-label={t('accessibility.notifications')}
        >
          <Bell size={20} aria-hidden="true" />
        </button>

        <button
          className={styles.userAvatar}
          type="button"
          aria-label={t('accessibility.userMenu')}
        >
          <User size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
