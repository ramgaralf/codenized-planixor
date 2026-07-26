package com.codenized.planixor.ui.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.AnnualHoursConfig
import com.codenized.planixor.domain.model.TypeAggregate
import com.codenized.planixor.domain.util.formatDuration
import com.codenized.planixor.domain.util.formatHoursComparison
import com.codenized.planixor.ui.components.DateNavigator
import com.codenized.planixor.ui.components.TimeRangeSelector
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Reports screen displaying analytics in a single-column vertical layout.
 * Components from top to bottom: TimeRangeSelector, DateNavigator, Charts/Tables.
 * Observes ReportsViewModel state for navigation and aggregated report data.
 * Also renders the AnnualConfigDialog when opened via the top bar config button.
 */
@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ReportsContent(
        uiState = uiState,
        onModeChange = viewModel::switchMode,
        onPreviousMonth = viewModel::navigatePreviousMonth,
        onNextMonth = viewModel::navigateNextMonth,
        onPreviousYear = viewModel::navigatePreviousYear,
        onNextYear = viewModel::navigateNextYear,
        onToday = viewModel::navigateToday,
    )

    // Annual config dialog — controlled by ViewModel state
    AnnualConfigDialog(
        isOpen = uiState.isConfigDialogOpen,
        selectedYear = uiState.selectedYear,
        existingValue = uiState.reportData?.annualConfig?.configuredHours,
        onSave = viewModel::saveAnnualConfig,
        onDelete = viewModel::deleteAnnualConfig,
        onDismiss = viewModel::closeConfigDialog,
    )
}

@Composable
private fun ReportsContent(
    uiState: ReportsUiState,
    onModeChange: (ReportMode) -> Unit,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onPreviousYear: () -> Unit,
    onNextYear: () -> Unit,
    onToday: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        TimeRangeSelector(
            selectedMode = uiState.mode,
            onModeChange = onModeChange,
        )

        Spacer(modifier = Modifier.height(16.dp))

        DateNavigator(
            mode = uiState.mode,
            selectedMonth = uiState.selectedMonth,
            selectedYear = uiState.selectedYear,
            onPreviousMonth = onPreviousMonth,
            onNextMonth = onNextMonth,
            onPreviousYear = onPreviousYear,
            onNextYear = onNextYear,
            onToday = onToday,
        )

        Spacer(modifier = Modifier.height(24.dp))

        when {
            // Loading state
            uiState.isLoading || uiState.reportData == null -> {
                LoadingIndicator()
            }
            // Empty state: both shifts and reminders are empty
            uiState.reportData.shifts.isEmpty() && uiState.reportData.reminders.isEmpty() -> {
                EmptyStateMessage()
            }
            // Data available: render sections conditionally
            else -> {
                ReportSections(
                    reportData = uiState.reportData,
                    mode = uiState.mode,
                )
            }
        }
    }
}

@Composable
private fun LoadingIndicator(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun EmptyStateMessage(
    modifier: Modifier = Modifier,
) {
    val emptyMessage = stringResource(R.string.reports_empty_state)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp)
            .semantics {
                contentDescription = emptyMessage
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = emptyMessage,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ReportSections(
    reportData: ReportData,
    mode: ReportMode,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Shifts section: only if shifts have data
        if (reportData.shifts.isNotEmpty()) {
            ShiftsSection(
                shifts = reportData.shifts,
                totalShiftMinutes = reportData.totalShiftMinutes,
                annualConfig = reportData.annualConfig,
                mode = mode,
            )
        }

        // Reminders section: only if reminders have data
        if (reportData.reminders.isNotEmpty()) {
            if (reportData.shifts.isNotEmpty()) {
                Spacer(modifier = Modifier.height(32.dp))
            }
            RemindersSection(
                reminders = reportData.reminders,
                totalReminderMinutes = reportData.totalReminderMinutes,
                mode = mode,
            )
        }
    }
}

@Composable
private fun ShiftsSection(
    shifts: List<TypeAggregate>,
    totalShiftMinutes: Int,
    annualConfig: AnnualHoursConfig?,
    mode: ReportMode,
    modifier: Modifier = Modifier,
) {
    val sortedForBar = shifts // already sorted descending by ViewModel
    val sortedForTable = when (mode) {
        ReportMode.MONTH -> shifts.sortedBy { it.name }
        ReportMode.YEAR -> shifts // descending by hours (already sorted)
    }

    val useComparison = mode == ReportMode.YEAR && annualConfig != null
    val configuredMinutes = if (useComparison) annualConfig!!.configuredHours * 60 else 0

    // Build donut data: add "remaining" segment when annual config exists and total < configured
    val donutData: List<TypeAggregate>
    val donutTotalMinutes: Int

    if (useComparison && totalShiftMinutes < configuredMinutes) {
        val remainingMinutes = configuredMinutes - totalShiftMinutes
        donutData = sortedForBar + TypeAggregate(
            typeId = "__remaining__",
            name = "Remaining",
            icon = "",
            backgroundColor = "#E5E7EB",
            totalMinutes = remainingMinutes,
            eventCount = 0,
            percentage = 0.0,
        )
        donutTotalMinutes = configuredMinutes
    } else if (useComparison) {
        donutData = sortedForBar
        donutTotalMinutes = totalShiftMinutes
    } else {
        donutData = sortedForBar
        donutTotalMinutes = totalShiftMinutes
    }

    val showDonut = donutTotalMinutes > 0
    val centerText = if (useComparison) {
        formatHoursComparison(totalShiftMinutes, annualConfig!!.configuredHours)
    } else {
        formatDuration(totalShiftMinutes)
    }

    Column(modifier = modifier.fillMaxWidth()) {
        SectionHeader(title = stringResource(R.string.reports_shifts_section))

        Spacer(modifier = Modifier.height(12.dp))

        HorizontalBarChart(data = sortedForBar)

        if (showDonut) {
            Spacer(modifier = Modifier.height(16.dp))

            ReportDonutChart(
                data = donutData,
                totalMinutes = donutTotalMinutes,
                centerText = centerText,
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        ReportTable(
            data = sortedForTable,
            totalMinutes = totalShiftMinutes,
            annualConfig = if (mode == ReportMode.YEAR) annualConfig else null,
        )
    }
}

@Composable
private fun RemindersSection(
    reminders: List<TypeAggregate>,
    totalReminderMinutes: Int,
    mode: ReportMode,
    modifier: Modifier = Modifier,
) {
    val sortedForBar = reminders // already sorted descending by ViewModel
    val sortedForTable = when (mode) {
        ReportMode.MONTH -> reminders.sortedByDescending { it.totalMinutes }
        ReportMode.YEAR -> reminders // descending by hours (already sorted)
    }

    val showDonut = totalReminderMinutes > 0
    val centerText = formatDuration(totalReminderMinutes)

    Column(modifier = modifier.fillMaxWidth()) {
        SectionHeader(title = stringResource(R.string.reports_reminders_section))

        Spacer(modifier = Modifier.height(12.dp))

        HorizontalBarChart(data = sortedForBar)

        if (showDonut) {
            Spacer(modifier = Modifier.height(16.dp))

            ReportDonutChart(
                data = sortedForBar,
                totalMinutes = totalReminderMinutes,
                centerText = centerText,
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        ReportTable(
            data = sortedForTable,
            totalMinutes = totalReminderMinutes,
        )
    }
}

@Composable
private fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        color = MaterialTheme.colorScheme.onSurface,
        modifier = modifier,
    )
}

@Preview(showBackground = true)
@Composable
private fun ReportsContentEmptyPreview() {
    PlanixorTheme {
        ReportsContent(
            uiState = ReportsUiState(
                reportData = ReportData(
                    shifts = emptyList(),
                    reminders = emptyList(),
                    totalShiftMinutes = 0,
                    totalReminderMinutes = 0,
                    annualConfig = null,
                ),
            ),
            onModeChange = {},
            onPreviousMonth = {},
            onNextMonth = {},
            onPreviousYear = {},
            onNextYear = {},
            onToday = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportsContentLoadingPreview() {
    PlanixorTheme {
        ReportsContent(
            uiState = ReportsUiState(isLoading = true),
            onModeChange = {},
            onPreviousMonth = {},
            onNextMonth = {},
            onPreviousYear = {},
            onNextYear = {},
            onToday = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportsContentWithShiftsOnlyPreview() {
    PlanixorTheme {
        ReportsContent(
            uiState = ReportsUiState(
                reportData = ReportData(
                    shifts = listOf(
                        TypeAggregate("1", "Morning", "☀️", "#10B981", 480, 5, 60.0),
                        TypeAggregate("2", "Night", "🌙", "#2563EB", 320, 3, 40.0),
                    ),
                    reminders = emptyList(),
                    totalShiftMinutes = 800,
                    totalReminderMinutes = 0,
                    annualConfig = null,
                ),
            ),
            onModeChange = {},
            onPreviousMonth = {},
            onNextMonth = {},
            onPreviousYear = {},
            onNextYear = {},
            onToday = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportsContentFullPreview() {
    PlanixorTheme {
        ReportsContent(
            uiState = ReportsUiState(
                reportData = ReportData(
                    shifts = listOf(
                        TypeAggregate("1", "Morning", "☀️", "#10B981", 480, 5, 60.0),
                        TypeAggregate("2", "Night", "🌙", "#2563EB", 320, 3, 40.0),
                    ),
                    reminders = listOf(
                        TypeAggregate("3", "Exercise", "🏃", "#F97316", 120, 4, 100.0),
                    ),
                    totalShiftMinutes = 800,
                    totalReminderMinutes = 120,
                    annualConfig = null,
                ),
            ),
            onModeChange = {},
            onPreviousMonth = {},
            onNextMonth = {},
            onPreviousYear = {},
            onNextYear = {},
            onToday = {},
        )
    }
}
