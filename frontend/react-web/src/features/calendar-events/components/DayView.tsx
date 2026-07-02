import { useEffect, useMemo, useRef } from 'react';

import type { CalendarEventDisplay } from '../models';
import { formatTimeFromMinutes, getEffectiveTimes } from '../utils';

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

/**
 * Places events into non-overlapping columns using a greedy approach.
 * Uses effective start/end times (adjusted for multi-day events on intermediate days).
 */
const placeEventsInColumns = (
  sorted: { effectiveStart: number; effectiveEnd: number; event: CalendarEventDisplay }[],
): { endTime: number; event: CalendarEventDisplay }[][] => {
  const columns: { endTime: number; event: CalendarEventDisplay }[][] = [];

  for (const { effectiveStart, effectiveEnd, event } of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const column = columns[col];
      if (!column) continue;
      const lastInCol = column[column.length - 1];
      if (!lastInCol) continue;
      if (lastInCol.endTime <= effectiveStart) {
        column.push({ endTime: effectiveEnd, event });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([{ endTime: effectiveEnd, event }]);
    }
  }

  return columns;
};

const computeEventPositions = (events: CalendarEventDisplay[], currentDayStr: string): PositionedEvent[] => {
  if (events.length === 0) return [];

  const withEffective = events
    .map((event) => ({
      ...getEffectiveTimes(event, currentDayStr),
      event,
    }))
    .filter(({ effectiveStart, effectiveEnd }) => effectiveEnd > effectiveStart);

  if (withEffective.length === 0) return [];

  const sorted = [...withEffective].sort((a, b) => a.effectiveStart - b.effectiveStart || a.effectiveEnd - b.effectiveEnd);
  const columns = placeEventsInColumns(sorted);

  // Build column index map
  const eventColumns = new Map<string, number>();
  for (let col = 0; col < columns.length; col++) {
    const column = columns[col];
    if (!column) continue;
    for (const entry of column) {
      eventColumns.set(entry.event.id, col);
    }
  }

  // Determine overlap groups using effective times
  const effectiveMap = new Map(sorted.map((s) => [s.event.id, s]));

  return sorted.map(({ event }) => {
    const current = effectiveMap.get(event.id)!;
    const overlapping = sorted.filter(
      (other) => other.effectiveStart < current.effectiveEnd && other.effectiveEnd > current.effectiveStart
    );
    const maxCol = Math.max(...overlapping.map((e) => eventColumns.get(e.event.id) ?? 0));

    return {
      event,
      column: eventColumns.get(event.id) ?? 0,
      totalColumns: maxCol + 1,
    };
  });
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

  // Memoize positioned events with current day context for multi-day handling
  const currentDayStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  const positionedEvents = useMemo(() => computeEventPositions(events, currentDayStr), [events, currentDayStr]);

  // Auto-scroll to center current hour on mount (today only)
  useEffect(() => {
    if (!isToday || !timelineRef.current) return;

    const container = timelineRef.current;
    const now = new Date();
    const currentHourOffset = now.getHours() * HOUR_SLOT_HEIGHT;
    const containerHeight = container.clientHeight;
    const scrollTarget = currentHourOffset - containerHeight / 2;

    container.scrollTo?.({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
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
              const { effectiveStart, effectiveEnd } = getEffectiveTimes(event, currentDayStr);

              const topOffset = (effectiveStart / 60) * HOUR_SLOT_HEIGHT;
              const height = Math.max(((effectiveEnd - effectiveStart) / 60) * HOUR_SLOT_HEIGHT, 30);
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
