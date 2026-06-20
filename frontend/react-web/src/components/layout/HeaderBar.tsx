import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Plus, Settings, User } from 'lucide-react';

import logoIcon from '@/assets/logo-icon.svg';

import { useCalendarStore } from '@/stores/calendarStore';
import { useReportsStore } from '@/stores/reportsStore';

import { NotificationBadge } from '@features/notifications/components/NotificationBadge';
import { NotificationView } from '@features/notifications/components/NotificationView';
import { useNotifications } from '@features/notifications/hooks/useNotifications';

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
  const { unreadCount, channel } = useNotifications();
  const pageTitle = t(getPageTitleKey(pathname));
  const isCalendar = pathname === '/';
  const isShiftsList = pathname === '/shifts';
  const isRemindersList = pathname === '/reminders';
  const isReports = pathname === '/reports';
  const showAnnualConfigButton = isReports && reportMode === 'year';

  // Bell icon visibility: visible when channel is "app" or "both", hidden when "system"
  const showBellIcon = channel !== 'system';

  // Notification dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const bellContainerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellContainerRef.current &&
        !bellContainerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, closeDropdown]);

  return (
    <header className={styles.headerBar}>
      <div className={styles.mobileLogo}>
        <img src={logoIcon} alt="" aria-hidden="true" className={styles.mobileLogoIcon} />
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

        {showBellIcon && (
          <div ref={bellContainerRef} className="relative">
            <button
              className={styles.iconButton}
              type="button"
              aria-label={t('accessibility.notifications')}
              aria-expanded={isDropdownOpen}
              aria-haspopup="dialog"
              onClick={toggleDropdown}
            >
              <Bell size={20} aria-hidden="true" />
              <NotificationBadge count={unreadCount} />
            </button>

            {isDropdownOpen && <NotificationView onClose={closeDropdown} />}
          </div>
        )}

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
