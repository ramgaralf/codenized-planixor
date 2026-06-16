import { useEffect, useMemo, useRef } from 'react';

import type { CalendarEventDisplay } from '../models';
import { formatTimeFromMinutes } from '../utils';

import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { EventCard } from './EventCard';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_SLOT_HEIGHT = 60;

interface DayViewProps {
  events: CalendarEventDisplay[];
  currentDate: Date;
  onEventClick: (event: CalendarEventDisplay) => void;
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Computes layout columns for overlapping events.
 * Returns events with assigned column index and total columns in their group.
 */
interface PositionedEvent {
  event: CalendarEventDisplay;
  column: number;
  totalColumns: number;
}

const computeEventPositions = (events: CalendarEventDisplay[]): PositionedEvent[] => {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);

  const columns: { endTime: number; event: CalendarEventDisplay }[][] = [];

  for (const event of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      if (lastInCol.endTime <= event.startTime) {
        columns[col].push({ endTime: event.endTime, event });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([{ endTime: event.endTime, event }]);
    }
  }

  const result: PositionedEvent[] = [];

  // Build overlap groups to determine totalColumns per event
  const eventColumns = new Map<string, number>();
  for (let col = 0; col < columns.length; col++) {
    for (const entry of columns[col]) {
      eventColumns.set(entry.event.id, col);
    }
  }

  // Determine overlap groups: events that share any time overlap get the same totalColumns
  for (const event of sorted) {
    // Find all events that overlap with this event
    const overlapping = sorted.filter(
      (other) => other.startTime < event.endTime && other.endTime > event.startTime
    );
    const maxCol = Math.max(...overlapping.map((e) => eventColumns.get(e.id) ?? 0));
    const totalColumns = maxCol + 1;

    result.push({
      event,
      column: eventColumns.get(event.id) ?? 0,
      totalColumns,
    });
  }

  return result;
};

/**
 * DayView — vertical timeline 00:00–23:59 with event cards positioned by time.
 *
 * Features:
 * - 24 hour slots (60px each)
 * - Events positioned absolutely by startTime
 * - Overlapping events displayed side by side
 * - CurrentTimeIndicator for today
 * - Auto-scroll to current hour on open
 * - Navigation controls: DayNavigator, MonthNavigator, YearNavigator
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */
export const DayView = ({ events, currentDate, onEventClick }: DayViewProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const isToday = isSameDay(currentDate, new Date());

  const hourLabels = useMemo(() => {
    return HOURS.map((hour) => formatTimeFromMinutes(hour * 60));
  }, []);

  // Memoize positioned events
  const positionedEvents = useMemo(() => computeEventPositions(events), [events]);

  // Auto-scroll to center current hour on mount (today only)
  useEffect(() => {
    if (!isToday || !timelineRef.current) return;

    const container = timelineRef.current;
    const now = new Date();
    const currentHourOffset = now.getHours() * HOUR_SLOT_HEIGHT;
    const containerHeight = container.clientHeight;
    const scrollTarget = currentHourOffset - containerHeight / 2;

    container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
  }, [isToday]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Timeline */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto"
        role="grid"
        aria-label={currentDate.toLocaleDateString()}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr',
            position: 'relative',
            minHeight: `${24 * HOUR_SLOT_HEIGHT}px`,
          }}
        >
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div key={hour} style={{ display: 'contents' }} role="row">
              <span
                role="rowheader"
                aria-label={hourLabels[hour]}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  padding: '4px 8px',
                  fontFamily: 'var(--font-family)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1',
                  userSelect: 'none',
                  height: `${HOUR_SLOT_HEIGHT}px`,
                  boxSizing: 'border-box',
                }}
              >
                {hourLabels[hour]}
              </span>
              <div
                role="gridcell"
                aria-label={hourLabels[hour]}
                style={{
                  position: 'relative',
                  minHeight: `${HOUR_SLOT_HEIGHT}px`,
                  borderTop: '1px solid var(--color-border)',
                  borderLeft: '1px solid var(--color-border)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {/* Events container: positioned over the slot area (right of labels) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '64px',
              right: 0,
              height: `${24 * HOUR_SLOT_HEIGHT}px`,
              pointerEvents: 'none',
            }}
          >
            {positionedEvents.map(({ event, column, totalColumns }) => {
              const topOffset = (event.startTime / 60) * HOUR_SLOT_HEIGHT;
              const height = ((event.endTime - event.startTime) / 60) * HOUR_SLOT_HEIGHT;
              const widthPercent = 100 / totalColumns;
              const leftPercent = column * widthPercent;

              return (
                <div
                  key={event.id}
                  style={{
                    position: 'absolute',
                    top: `${topOffset}px`,
                    left: `${leftPercent}%`,
                    width: `calc(${widthPercent}% - 4px)`,
                    height: `${height}px`,
                    zIndex: 1,
                    padding: '1px',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto',
                  }}
                >
                  <EventCard event={event} onClick={onEventClick} height={height} />
                </div>
              );
            })}
          </div>

          {/* Current time indicator */}
          {isToday && <CurrentTimeIndicator />}
        </div>
      </div>
    </div>
  );
};
