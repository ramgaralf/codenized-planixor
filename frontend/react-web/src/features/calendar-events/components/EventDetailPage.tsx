import type { CalendarEventDisplay } from '../models';

import { EventForm } from './EventForm';

interface EventDetailPageProps {
  /** The calendar event to display/edit */
  event: CalendarEventDisplay;
  /** Callback to navigate back */
  onBack: () => void;
  /** Callback when user clicks delete (container handles the confirmation modal) */
  onDelete?: () => void;
}

/**
 * EventDetailPage — wraps EventForm in edit mode with a delete action.
 * Styled to match the ShiftEditPage pattern (same page container, form inside).
 * The delete button is rendered inside EventForm's action row (left-aligned).
 *
 * **Validates: Requirements 7.1, 7.2, 7.4, 7.5**
 */
export const EventDetailPage = ({ event, onBack, onDelete }: EventDetailPageProps) => {
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px' }}>
      <EventForm
        existingEvent={event}
        onSuccess={onBack}
        onCancel={onBack}
        onDelete={onDelete}
      />
    </div>
  );
};
