import { create } from 'zustand';

type ReportMode = 'month' | 'year';

interface ReportsState {
  /** Current report mode (synced from useReportData hook) */
  mode: ReportMode;
  /** Whether the annual config modal is open */
  isConfigModalOpen: boolean;
  /** Set the current report mode (called by the reports container) */
  setMode: (mode: ReportMode) => void;
  /** Open the annual config modal (called by the HeaderBar button) */
  openConfigModal: () => void;
  /** Close the annual config modal */
  closeConfigModal: () => void;
}

/**
 * Zustand store for report state shared between the Reports feature
 * and the global HeaderBar. The HeaderBar reads `mode` to conditionally
 * show the Annual_Config_Button and calls `openConfigModal` when clicked.
 */
export const useReportsStore = create<ReportsState>()((set) => ({
  mode: 'month',
  isConfigModalOpen: false,
  setMode: (mode) => set({ mode }),
  openConfigModal: () => set({ isConfigModalOpen: true }),
  closeConfigModal: () => set({ isConfigModalOpen: false }),
}));

export type { ReportsState, ReportMode };
