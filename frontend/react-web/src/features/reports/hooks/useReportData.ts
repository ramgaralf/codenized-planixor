import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/data/db';
import type { CalendarEvent } from '@features/calendar-events/models';
import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

import type { ReportData, TypeAggregate } from '../models';
import {
  filterEventsForPeriod,
  aggregateByType,
  computePercentages,
  normalizeTotalMinutes,
  sortByTotalDescending,
} from '../services/reportAggregator';

type ReportMode = 'month' | 'year';

const FALLBACK_ICON = '\u2753';
const FALLBACK_NAME = 'Unknown';
const FALLBACK_COLOR = '#6B7280';

interface ReportsState {
  mode: ReportMode;
  selectedMonth: number;
  selectedYear: number;
  previousMonth: number;
  previousYear: number;
  isConfigModalOpen: boolean;
}

export interface UseReportDataReturn {
  mode: ReportMode;
  selectedMonth: number;
  selectedYear: number;
  isConfigModalOpen: boolean;
  reportData: ReportData | null;
  isLoading: boolean;
  setMode: (mode: ReportMode) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToToday: () => void;
  openConfigModal: () => void;
  closeConfigModal: () => void;
}

/**
 * Computes the start and end dates (ISO YYYY-MM-DD) for a given month.
 */
const getMonthRange = (year: number, month: number): { start: string; end: string } => {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start: startDate, end: endDate };
};

/**
 * Computes the start and end dates (ISO YYYY-MM-DD) for a given year.
 */
const getYearRange = (year: number): { start: string; end: string } => {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
};

/**
 * Resolves shift/reminder metadata for a given eventTypeId.
 * Queries include soft-deleted definitions (for display purposes).
 * Falls back to icon ❓, name "Unknown", color #6B7280 if not found.
 */
const resolveTypeMetadata = (
  typeId: string,
  eventType: 'shift' | 'reminder',
  shifts: Shift[],
  reminders: Reminder[],
): { name: string; icon: string; backgroundColor: string } => {
  if (eventType === 'shift') {
    const shift = shifts.find((s) => s.id === typeId);
    if (shift) {
      return { name: shift.name, icon: shift.icon, backgroundColor: shift.backgroundColor };
    }
  } else {
    const reminder = reminders.find((r) => r.id === typeId);
    if (reminder) {
      return { name: reminder.name, icon: reminder.icon, backgroundColor: reminder.backgroundColor };
    }
  }
  return { name: FALLBACK_NAME, icon: FALLBACK_ICON, backgroundColor: FALLBACK_COLOR };
};

/**
 * Builds TypeAggregate[] from a totals map and metadata lookups.
 */
const buildAggregates = (
  totalsMap: Map<string, number>,
  percentages: Map<string, number>,
  eventType: 'shift' | 'reminder',
  shifts: Shift[],
  reminders: Reminder[],
): TypeAggregate[] => {
  const aggregates: TypeAggregate[] = [];

  for (const [typeId, totalMinutes] of totalsMap) {
    const metadata = resolveTypeMetadata(typeId, eventType, shifts, reminders);
    const percentage = percentages.get(typeId) ?? 0;

    aggregates.push({
      typeId,
      name: metadata.name,
      icon: metadata.icon,
      backgroundColor: metadata.backgroundColor,
      totalMinutes: normalizeTotalMinutes(totalMinutes),
      percentage,
    });
  }

  return aggregates;
};

/**
 * useReportData — main hook for the Reports feature state and data aggregation.
 *
 * Manages the report mode (month/year), date selection, mode-switching
 * with date preservation, and reactive recalculation of report data from
 * local IndexedDB stores.
 *
 * _Requirements: 1.6, 11.1, 11.2, 11.3, 11.4, 11.5_
 */
export const useReportData = (): UseReportDataReturn => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [state, setState] = useState<ReportsState>({
    mode: 'month',
    selectedMonth: currentMonth,
    selectedYear: currentYear,
    previousMonth: currentMonth,
    previousYear: currentYear,
    isConfigModalOpen: false,
  });

  // Compute date range based on current mode and selection
  const dateRange = useMemo(() => {
    if (state.mode === 'month') {
      return getMonthRange(state.selectedYear, state.selectedMonth);
    }
    return getYearRange(state.selectedYear);
  }, [state.mode, state.selectedMonth, state.selectedYear]);

  // Reactive query: all calendar events (we filter client-side for flexibility)
  const allEvents = useLiveQuery(
    () =>
      db.calendarEvents
        .where('startDay')
        .between(dateRange.start, dateRange.end, true, true)
        .toArray(),
    [dateRange.start, dateRange.end],
  );

  // Query ALL shifts and reminders (including soft-deleted) for metadata lookups
  const allShifts = useLiveQuery(() => db.shifts.toArray(), []);
  const allReminders = useLiveQuery(() => db.reminders.toArray(), []);

  // Query annual config for year mode
  const annualConfig = useLiveQuery(
    () => {
      if (state.mode !== 'year') return Promise.resolve(null);
      return db.annualHoursConfig
        .where('year')
        .equals(state.selectedYear)
        .filter((r) => !r.isDeleted)
        .first()
        .then((r) => r ?? null);
    },
    [state.mode, state.selectedYear],
  );

  const isLoading =
    allEvents === undefined || allShifts === undefined || allReminders === undefined;

  // Compute report data reactively
  const reportData: ReportData | null = useMemo(() => {
    if (!allEvents || !allShifts || !allReminders) return null;

    const events = allEvents as CalendarEvent[];
    const shifts = allShifts as Shift[];
    const reminders = allReminders as Reminder[];

    // Filter events for the period (non-deleted, within date range)
    const filteredEvents = filterEventsForPeriod(events, dateRange.start, dateRange.end);

    // Separate by type
    const shiftEvents = filteredEvents.filter((e) => e.eventType === 'shift');
    const reminderEvents = filteredEvents.filter((e) => e.eventType === 'reminder');

    // Aggregate shifts
    const shiftTotals = aggregateByType(shiftEvents);
    const totalShiftMinutes = Array.from(shiftTotals.values()).reduce(
      (sum, val) => sum + normalizeTotalMinutes(val),
      0,
    );

    // For year mode with annual config, use configuredHours as denominator
    const shiftConfiguredHours =
      state.mode === 'year' && annualConfig ? annualConfig.configuredHours : undefined;
    const shiftPercentages = computePercentages(shiftTotals, shiftConfiguredHours);

    // Aggregate reminders (always relative percentages)
    const reminderTotals = aggregateByType(reminderEvents);
    const totalReminderMinutes = Array.from(reminderTotals.values()).reduce(
      (sum, val) => sum + normalizeTotalMinutes(val),
      0,
    );
    const reminderPercentages = computePercentages(reminderTotals);

    // Build type aggregates with metadata
    const shiftAggregates = buildAggregates(
      shiftTotals,
      shiftPercentages,
      'shift',
      shifts,
      reminders,
    );
    const reminderAggregates = buildAggregates(
      reminderTotals,
      reminderPercentages,
      'reminder',
      shifts,
      reminders,
    );

    // Sort by total descending for bar charts
    const sortedShifts = sortByTotalDescending(shiftAggregates);
    const sortedReminders = sortByTotalDescending(reminderAggregates);

    return {
      shifts: sortedShifts,
      reminders: sortedReminders,
      totalShiftMinutes,
      totalReminderMinutes,
      annualConfig: state.mode === 'year' ? (annualConfig ?? null) : null,
    };
  }, [allEvents, allShifts, allReminders, dateRange, state.mode, annualConfig]);

  // Mode switching with date preservation
  const setMode = useCallback((newMode: ReportMode) => {
    setState((prev) => {
      if (newMode === prev.mode) return prev;

      if (newMode === 'year') {
        // Month → Year: save current month/year as previous, preserve year
        return {
          ...prev,
          mode: 'year',
          previousMonth: prev.selectedMonth,
          previousYear: prev.selectedYear,
        };
      }
      // Year → Month: restore previous month
      return {
        ...prev,
        mode: 'month',
        selectedMonth: prev.previousMonth,
        selectedYear: prev.previousYear,
      };
    });
  }, []);

  const goToPrevious = useCallback(() => {
    setState((prev) => {
      if (prev.mode === 'year') {
        const minYear = currentYear - 10;
        if (prev.selectedYear <= minYear) return prev;
        return { ...prev, selectedYear: prev.selectedYear - 1 };
      }
      // Month mode
      if (prev.selectedMonth === 0) {
        const minYear = currentYear - 10;
        if (prev.selectedYear <= minYear) return prev;
        return { ...prev, selectedMonth: 11, selectedYear: prev.selectedYear - 1 };
      }
      return { ...prev, selectedMonth: prev.selectedMonth - 1 };
    });
  }, [currentYear]);

  const goToNext = useCallback(() => {
    setState((prev) => {
      if (prev.mode === 'year') {
        const maxYear = currentYear + 10;
        if (prev.selectedYear >= maxYear) return prev;
        return { ...prev, selectedYear: prev.selectedYear + 1 };
      }
      // Month mode
      if (prev.selectedMonth === 11) {
        const maxYear = currentYear + 10;
        if (prev.selectedYear >= maxYear) return prev;
        return { ...prev, selectedMonth: 0, selectedYear: prev.selectedYear + 1 };
      }
      return { ...prev, selectedMonth: prev.selectedMonth + 1 };
    });
  }, [currentYear]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setState((prev) => {
      if (prev.mode === 'year') {
        return { ...prev, selectedYear: today.getFullYear() };
      }
      return {
        ...prev,
        selectedMonth: today.getMonth(),
        selectedYear: today.getFullYear(),
      };
    });
  }, []);

  const openConfigModal = useCallback(() => {
    setState((prev) => ({ ...prev, isConfigModalOpen: true }));
  }, []);

  const closeConfigModal = useCallback(() => {
    setState((prev) => ({ ...prev, isConfigModalOpen: false }));
  }, []);

  return {
    mode: state.mode,
    selectedMonth: state.selectedMonth,
    selectedYear: state.selectedYear,
    isConfigModalOpen: state.isConfigModalOpen,
    reportData,
    isLoading,
    setMode,
    goToPrevious,
    goToNext,
    goToToday,
    openConfigModal,
    closeConfigModal,
  };
};
