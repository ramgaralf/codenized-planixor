import { useTranslation } from 'react-i18next';

import styles from './StubPage.module.css';

export const ShiftsPage = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.stubPage}>
      <p className={styles.placeholder}>{t('nav.shifts')}</p>
    </div>
  );
};
