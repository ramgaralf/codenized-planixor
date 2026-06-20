import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';

import { ThemeProvider } from '@context/ThemeContext';
import { registerNotificationWorker } from '@features/notifications/services/notificationWorkerManager';
import i18n from '@/infrastructure/i18n';
import { router } from '@/app/routes';

export const App = () => {
  useEffect(() => {
    registerNotificationWorker();
  }, []);

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </ThemeProvider>
  );
};
