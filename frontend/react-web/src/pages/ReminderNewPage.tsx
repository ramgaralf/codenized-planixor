import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ReminderForm } from '@features/reminders/components/ReminderForm';

export const ReminderNewPage = () => {
  const navigate = useNavigate();

  const handleSubmitSuccess = useCallback(() => {
    navigate('/reminders');
  }, [navigate]);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px' }}>
      <ReminderForm onSubmitSuccess={handleSubmitSuccess} />
    </div>
  );
};
