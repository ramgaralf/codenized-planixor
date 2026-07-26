import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useReportsStore } from '@/stores/reportsStore';

import { TimeRangeSelector } from './components/TimeRangeSelector';
import { DateNavigator } from './components/DateNavigator';
import { EmptyState } from './components/EmptyState';
import { ShiftsSection } from './components/ShiftsSection';
import { RemindersSection } from './components/RemindersSection';
import { AnnualConfigModal } from './components/AnnualConfigModal';
import { useReportData } from './hooks/useReportData';
import { useAnnualConfig } from './hooks/useAnnualConfig';

/**
 * Reports container component — orchestrates the reports feature.
 *
 * Manages report state (mode, date selection) via useReportData hook
 * and wires TimeRangeSelector and DateNavigator events to state.
 * Syncs mode to the shared reportsStore so the HeaderBar can
 * conditionally show the Annual_Config_Button.
 * Renders children conditionally based on data availability.
 * Does NOT render its own page title (handled by global top bar).
 *
 * _Requirements: 1.6, 1.7, 1.8, 8.1, 8.9, 11.1, 11.2, 11.3, 11.4, 11.5_
 */
export const Reports = () => {
  const { t } = useTranslation();

  const {
    mode,
    selectedMonth,
    selectedYear,
    reportData,
    isLoading,
    setMode,
    goToPreviousMonth,
    goToNextMonth,
    goToPreviousYear,
    goToNextYear,
    goToToday,
  } = useReportData();

  const { save, softDelete } = useAnnualConfig();

  // Shared store for HeaderBar integration
  const storeSetMode = useReportsStore((state) => state.setMode);
  const isConfigModalOpen = useReportsStore((state) => state.isConfigModalOpen);
  const closeConfigModal = useReportsStore((state) => state.closeConfigModal);

  // Sync mode to the shared store so HeaderBar can react
  useEffect(() => {
    storeSetMode(mode);
  }, [mode, storeSetMode]);

  // Reset store mode on unmount (navigating away from Reports page)
  useEffect(() => {
    return () => {
      storeSetMode('month');
    };
  }, [storeSetMode]);

  const handleModeChange = (newMode: 'month' | 'year') => {
    setMode(newMode);
  };

  const handleConfigSave = async (configuredHours: number) => {
    await save(selectedYear, configuredHours);
  };

  const handleConfigDelete = async () => {
    await softDelete(selectedYear);
  };

  // Derive existing config value for the modal
  const existingConfigValue = reportData?.annualConfig?.configuredHours ?? null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto" style={{ padding: '24px 32px' }}>
      <div className="flex flex-col gap-3">
        <TimeRangeSelector mode={mode} onModeChange={handleModeChange} />
        <DateNavigator
          mode={mode}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onPreviousYear={goToPreviousYear}
          onNextYear={goToNextYear}
          onToday={goToToday}
        />
      </div>

      <div className="flex flex-col gap-6 flex-1">
        {isLoading && (
          <div
            className="flex items-center justify-center flex-1"
            aria-live="polite"
            aria-busy="true"
          >
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('reports.loading', { defaultValue: 'Loading...' })}
            </span>
          </div>
        )}

        {!isLoading && reportData && (
          <>
            {reportData.shifts.length === 0 && reportData.reminders.length === 0 && (
              <EmptyState />
            )}

            {reportData.shifts.length > 0 && (
              <ShiftsSection
                data={reportData.shifts}
                totalMinutes={reportData.totalShiftMinutes}
                mode={mode}
                annualConfig={reportData.annualConfig}
              />
            )}

            {reportData.reminders.length > 0 && (
              <RemindersSection
                data={reportData.reminders}
                totalMinutes={reportData.totalReminderMinutes}
                mode={mode}
              />
            )}
          </>
        )}
      </div>

      <AnnualConfigModal
        isOpen={isConfigModalOpen}
        selectedYear={selectedYear}
        existingValue={existingConfigValue}
        onSave={handleConfigSave}
        onDelete={handleConfigDelete}
        onClose={closeConfigModal}
      />
    </div>
  );
};
