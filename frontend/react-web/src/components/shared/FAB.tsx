import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './FAB.module.css';

export const FAB = () => {
  const { t } = useTranslation();

  const handleClick = () => {
    // Stub: event creation flow will be implemented in a future issue
  };

  return (
    <button
      className={styles.fab}
      onClick={handleClick}
      aria-label={t('accessibility.fabLabel')}
      type="button"
    >
      <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
};
