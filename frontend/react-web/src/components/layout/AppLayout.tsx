import type { ReactNode } from 'react';

import styles from './AppLayout.module.css';

interface AppLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
  bottomNav?: ReactNode;
  fab?: ReactNode;
}

export const AppLayout = ({
  sidebar,
  children,
  rightPanel,
  bottomNav,
  fab,
}: AppLayoutProps) => {
  return (
    <div className={styles.layout}>
      {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
      <main className={styles.main}>{children}</main>
      {rightPanel && <aside className={styles.rightPanel}>{rightPanel}</aside>}
      {bottomNav && <nav className={styles.bottomNav}>{bottomNav}</nav>}
      {fab && <div className={styles.fab}>{fab}</div>}
    </div>
  );
};
