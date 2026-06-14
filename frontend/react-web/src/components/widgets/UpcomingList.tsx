import { useTranslation } from 'react-i18next';

import styles from './UpcomingList.module.css';

export const UpcomingList = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.container} aria-label={t('widgets.upcoming')}>
      <h3 className={styles.title}>{t('widgets.upcoming')}</h3>
      <div className={styles.listWrapper}>
        <p className={styles.emptyText}>{t('empty.noUpcoming')}</p>
      </div>
    </section>
  );
};
