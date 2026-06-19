import type { CalendarEvent } from '@features/calendar-events/models';
import type { TypeAggregate } from '../models';

/**
 * Donut segment with a minimum-arc-adjusted percentage value.
 */
export interface DonutSegment {
  typeId: string;
  percentage: number;
}

/**
 * Converts total minutes into a human-readable duration string.
 *
 * @param totalMinutes - Non-negative integer representing total minutes
 * @returns String in the format "{X}h {Y}m" where X = floor(totalMinutes/60), Y = totalMinutes mod 60
 */
export const formatDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

/**
 * Produces a comparison string showing actual hours vs configured hours.
 *
 * @param actualMinutes - Total actual minutes worked
 * @param configuredHours - Configured annual hours target (whole hours)
 * @returns String in the format "{X}h {Y}m / {A}h {B}m"
 */
export const formatHoursComparison = (
  actualMinutes: number,
  configuredHours: number,
): string => {
  return `${formatDuration(actualMinutes)} /\n${formatDuration(configuredHours * 60)}`;
};

/**
 * Clamps negative or zero values to 0.
 *
 * @param value - Input number (may be negative, zero, or positive)
 * @returns 0 if value <= 0, otherwise returns value unchanged
 */
export const normalizeTotalMinutes = (value: number): number => {
  return value <= 0 ? 0 : value;
};

/**
 * Filters calendar events to those within a date range (inclusive)
 * that are not soft-deleted.
 *
 * Inclusion rule: event.isDeleted === false AND event.startDay >= startDate
 * AND event.startDay <= endDate. The endDay field does NOT affect inclusion.
 *
 * @param events - Array of calendar events to filter
 * @param startDate - Start of the period (ISO date string YYYY-MM-DD, inclusive)
 * @param endDate - End of the period (ISO date string YYYY-MM-DD, inclusive)
 * @returns Filtered array of events within the period
 */
export const filterEventsForPeriod = (
  events: CalendarEvent[],
  startDate: string,
  endDate: string,
): CalendarEvent[] => {
  return events.filter(
    (event) =>
      !event.isDeleted &&
      event.startDay >= startDate &&
      event.startDay <= endDate,
  );
};

/**
 * Aggregated data per event type: total minutes and event count.
 */
export interface TypeTotals {
  totalMinutes: number;
  eventCount: number;
}

/**
 * Groups events by eventTypeId and sums their totalHours (stored in minutes),
 * also counting the number of events per type.
 *
 * @param events - Array of calendar events (should already be filtered for the period)
 * @returns Map where key = eventTypeId, value = { totalMinutes, eventCount }
 */
export const aggregateByType = (
  events: CalendarEvent[],
): Map<string, TypeTotals> => {
  const totals = new Map<string, TypeTotals>();

  for (const event of events) {
    const current = totals.get(event.eventTypeId) ?? { totalMinutes: 0, eventCount: 0 };
    totals.set(event.eventTypeId, {
      totalMinutes: current.totalMinutes + event.totalHours,
      eventCount: current.eventCount + 1,
    });
  }

  return totals;
};

/**
 * Calculates percentages for donut chart segments.
 *
 * Without configuredHours: each type = (typeMinutes / grandTotal) * 100
 * (relative percentages summing to 100%).
 *
 * With configuredHours: each type = (typeMinutes / (configuredHours * 60)) * 100
 * (percentages relative to configured hours, may exceed 100%).
 *
 * @param totalsMap - Map of typeId to TypeTotals (totalMinutes + eventCount)
 * @param configuredHours - Optional configured annual hours target
 * @returns Map of typeId to percentage value
 */
export const computePercentages = (
  totalsMap: Map<string, TypeTotals>,
  configuredHours?: number,
): Map<string, number> => {
  const percentages = new Map<string, number>();

  if (configuredHours !== undefined) {
    const denominator = configuredHours * 60;
    for (const [typeId, data] of totalsMap) {
      percentages.set(typeId, (data.totalMinutes / denominator) * 100);
    }
  } else {
    const grandTotal = Array.from(totalsMap.values()).reduce(
      (sum, val) => sum + val.totalMinutes,
      0,
    );

    if (grandTotal === 0) {
      for (const [typeId] of totalsMap) {
        percentages.set(typeId, 0);
      }
    } else {
      for (const [typeId, data] of totalsMap) {
        percentages.set(typeId, (data.totalMinutes / grandTotal) * 100);
      }
    }
  }

  return percentages;
};

/**
 * Applies donut chart segment rules:
 * - If a percentage is > 0 but < 1, set it to 1 (minimum arc).
 * - If only one type exists, set it to exactly 100.0.
 *
 * @param percentages - Map of typeId to percentage
 * @returns Array of donut segments with adjusted percentages
 */
export const computeDonutSegments = (
  percentages: Map<string, number>,
): DonutSegment[] => {
  const entries = Array.from(percentages.entries());

  if (entries.length === 1) {
    const entry = entries[0];
    if (entry) {
      return [{ typeId: entry[0], percentage: 100.0 }];
    }
  }

  return entries.map(([typeId, percentage]) => ({
    typeId,
    percentage: percentage > 0 && percentage < 1 ? 1 : percentage,
  }));
};

/**
 * Sorts type aggregates in descending order by totalMinutes.
 *
 * @param aggregates - Array of type aggregates
 * @returns New array sorted from highest to lowest totalMinutes
 */
export const sortByTotalDescending = (
  aggregates: TypeAggregate[],
): TypeAggregate[] => {
  return [...aggregates].sort((a, b) => b.totalMinutes - a.totalMinutes);
};

/**
 * Splits records into batches of a maximum size for sync operations.
 *
 * @param records - Array of records to batch
 * @param batchSize - Maximum number of records per batch (default: 100)
 * @returns Array of batches, each containing at most batchSize records
 */
export const createSyncBatches = <T>(
  records: T[],
  batchSize: number = 100,
): T[][] => {
  const batches: T[][] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }

  return batches;
};
