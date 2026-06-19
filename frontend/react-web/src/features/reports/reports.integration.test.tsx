import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { ReportData } from './models';

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      return params?.defaultValue ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  LabelList: () => <div data-testid="label-list" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}));

// Mock the hooks that provide data to the Reports container
const mockSetMode = vi.fn();
const mockGoToPrevious = vi.fn();
const mockGoToNext = vi.fn();
const mockGoToToday = vi.fn();
const mockOpenConfigModal = vi.fn();
const mockCloseConfigModal = vi.fn();
const mockSave = vi.fn().mockResolvedValue(undefined);
const mockSoftDelete = vi.fn().mockResolvedValue(undefined);

interface MockUseReportDataReturn {
  mode: 'month' | 'year';
  selectedMonth: number;
  selectedYear: number;
  isConfigModalOpen: boolean;
  reportData: ReportData | null;
  isLoading: boolean;
  setMode: typeof mockSetMode;
  goToPrevious: typeof mockGoToPrevious;
  goToNext: typeof mockGoToNext;
  goToToday: typeof mockGoToToday;
  openConfigModal: typeof mockOpenConfigModal;
  closeConfigModal: typeof mockCloseConfigModal;
}

let mockUseReportDataReturn: MockUseReportDataReturn;

vi.mock('./hooks/useReportData', () => ({
  useReportData: () => mockUseReportDataReturn,
}));

vi.mock('./hooks/useAnnualConfig', () => ({
  useAnnualConfig: () => ({
    save: mockSave,
    softDelete: mockSoftDelete,
    getByYear: vi.fn(),
    validateAnnualConfig: vi.fn(),
  }),
}));

// Mock the zustand store
let mockStoreIsConfigModalOpen = false;
const mockStoreSetMode = vi.fn();
const mockStoreCloseConfigModal = vi.fn();

vi.mock('@/stores/reportsStore', () => ({
  useReportsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      mode: 'month' as const,
      isConfigModalOpen: mockStoreIsConfigModalOpen,
      setMode: mockStoreSetMode,
      openConfigModal: vi.fn(),
      closeConfigModal: mockStoreCloseConfigModal,
    };
    return selector(state);
  },
}));

// Import after mocks are defined
import { Reports } from './reports';

describe('Reports Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreIsConfigModalOpen = false;
  });

  describe('Reports page renders charts for month with shift and reminder data', () => {
    it('should display shift and reminder sections when data exists for the selected month', () => {
      mockUseReportDataReturn = {
        mode: 'month',
        selectedMonth: 5,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [
            {
              typeId: 'shift-1',
              name: 'Morning',
              icon: '☀️',
              backgroundColor: '#10B981',
              totalMinutes: 480,
              eventCount: 5,
              percentage: 60,
            },
            {
              typeId: 'shift-2',
              name: 'Night',
              icon: '🌙',
              backgroundColor: '#2563EB',
              totalMinutes: 320,
              eventCount: 3,
              percentage: 40,
            },
          ],
          reminders: [
            {
              typeId: 'reminder-1',
              name: 'Exercise',
              icon: '🏋️',
              backgroundColor: '#7C3AED',
              totalMinutes: 180,
              eventCount: 6,
              percentage: 100,
            },
          ],
          totalShiftMinutes: 800,
          totalReminderMinutes: 180,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Both sections should be rendered
      expect(screen.getByLabelText('Shifts')).toBeInTheDocument();
      expect(screen.getByLabelText('Reminders')).toBeInTheDocument();

      // Empty state should NOT be shown
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Reports page shows empty state for empty month', () => {
    it('should display the empty state message when no events exist for the selected month', () => {
      mockUseReportDataReturn = {
        mode: 'month',
        selectedMonth: 0,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [],
          reminders: [],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Empty state should be shown
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('No data to display')).toBeInTheDocument();

      // Chart sections should NOT be rendered
      expect(screen.queryByLabelText('Shifts')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Reminders')).not.toBeInTheDocument();
    });
  });

  describe('Annual config modal save triggers chart refresh', () => {
    it('should call save and close modal when user submits valid annual config', async () => {
      const user = userEvent.setup();
      mockStoreIsConfigModalOpen = true;

      mockUseReportDataReturn = {
        mode: 'year',
        selectedMonth: 5,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [
            {
              typeId: 'shift-1',
              name: 'Morning',
              icon: '☀️',
              backgroundColor: '#10B981',
              totalMinutes: 480,
              eventCount: 5,
              percentage: 60,
            },
          ],
          reminders: [],
          totalShiftMinutes: 480,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Modal should be visible (controlled by store)
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Type a valid hours value
      const input = screen.getByRole('textbox');
      await user.type(input, '1800');

      // Click save
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // The save function should have been called with the correct value
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith(2025, 1800);
      });

      // The close modal function should have been called (triggers chart refresh implicitly)
      await waitFor(() => {
        expect(mockStoreCloseConfigModal).toHaveBeenCalled();
      });
    });
  });

  describe('Mode switch preserves date state (Month→Year→Month roundtrip)', () => {
    it('should call setMode with year when user clicks the Year tab', async () => {
      const user = userEvent.setup();

      mockUseReportDataReturn = {
        mode: 'month',
        selectedMonth: 7,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [],
          reminders: [],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Click Year tab
      const yearTab = screen.getByRole('tab', { name: 'views.year' });
      await user.click(yearTab);

      expect(mockSetMode).toHaveBeenCalledWith('year');
    });

    it('should call setMode with month when user clicks the Month tab from year mode', async () => {
      const user = userEvent.setup();

      mockUseReportDataReturn = {
        mode: 'year',
        selectedMonth: 7,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [],
          reminders: [],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Click Month tab
      const monthTab = screen.getByRole('tab', { name: 'views.month' });
      await user.click(monthTab);

      expect(mockSetMode).toHaveBeenCalledWith('month');
    });
  });

  describe('Today button resets to current period', () => {
    it('should call goToToday when the Today button is clicked in month mode', async () => {
      const user = userEvent.setup();

      mockUseReportDataReturn = {
        mode: 'month',
        selectedMonth: 2,
        selectedYear: 2023,
        isConfigModalOpen: false,
        reportData: {
          shifts: [],
          reminders: [],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      const todayButton = screen.getByRole('button', { name: 'Today' });
      await user.click(todayButton);

      expect(mockGoToToday).toHaveBeenCalledOnce();
    });

    it('should call goToToday when the Today button is clicked in year mode', async () => {
      const user = userEvent.setup();

      mockUseReportDataReturn = {
        mode: 'year',
        selectedMonth: 0,
        selectedYear: 2020,
        isConfigModalOpen: false,
        reportData: {
          shifts: [],
          reminders: [],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      const todayButton = screen.getByRole('button', { name: 'Today' });
      await user.click(todayButton);

      expect(mockGoToToday).toHaveBeenCalledOnce();
    });
  });

  describe('Donut chart does NOT render when all types have 0 total minutes', () => {
    it('should not render pie-chart when shift totalMinutes is 0 (avoids division by zero)', () => {
      mockUseReportDataReturn = {
        mode: 'month',
        selectedMonth: 5,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [
            {
              typeId: 'shift-1',
              name: 'Morning',
              icon: '☀️',
              backgroundColor: '#10B981',
              totalMinutes: 0,
              eventCount: 0,
              percentage: 0,
            },
          ],
          reminders: [],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Shifts section should be rendered (since shifts array is non-empty)
      expect(screen.getByLabelText('Shifts')).toBeInTheDocument();

      // DonutChart returns null when totalMinutes === 0, so pie-chart should not be in the DOM
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    it('should not render pie-chart when reminder totalMinutes is 0 (avoids division by zero)', () => {
      mockUseReportDataReturn = {
        mode: 'month',
        selectedMonth: 5,
        selectedYear: 2025,
        isConfigModalOpen: false,
        reportData: {
          shifts: [],
          reminders: [
            {
              typeId: 'reminder-1',
              name: 'Reading',
              icon: '📚',
              backgroundColor: '#7C3AED',
              totalMinutes: 0,
              eventCount: 0,
              percentage: 0,
            },
          ],
          totalShiftMinutes: 0,
          totalReminderMinutes: 0,
          annualConfig: null,
        },
        isLoading: false,
        setMode: mockSetMode,
        goToPrevious: mockGoToPrevious,
        goToNext: mockGoToNext,
        goToToday: mockGoToToday,
        openConfigModal: mockOpenConfigModal,
        closeConfigModal: mockCloseConfigModal,
      };

      render(<Reports />);

      // Reminders section should be rendered
      expect(screen.getByLabelText('Reminders')).toBeInTheDocument();

      // DonutChart should NOT render
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });
});
