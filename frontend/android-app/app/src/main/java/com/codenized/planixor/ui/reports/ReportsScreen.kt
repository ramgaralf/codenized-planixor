package com.codenized.planixor.ui.reports

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue

/**
 * Reports screen displaying analytics in a single-column vertical layout.
 * Components from top to bottom: TimeRangeSelector, BarChart, DonutChart, UpcomingList.
 * Currently renders in empty state — real data will be loaded in a future issue.
 */
@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ReportsContent(
        uiState = uiState,
        onTimeRangeSelected = viewModel::selectTimeRange,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportsContent(
    uiState: ReportsUiState,
    onTimeRangeSelected: (CalendarView) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        // Time Range Selector (Day/Week/Month/Year tabs)
        TimeRangeSelector(
            selectedRange = uiState.selectedRange,
            onRangeSelected = onTimeRangeSelected,
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Error state
        if (uiState.error != null) {
            Text(
                text = uiState.error,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(vertical = 8.dp),
            )
        }

        // Bar Chart
        Text(
            text = stringResource(R.string.widget_hours_worked),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )

        Spacer(modifier = Modifier.height(8.dp))

        ReportsBarChart()

        Spacer(modifier = Modifier.height(24.dp))

        // Donut Chart
        Text(
            text = stringResource(R.string.reports_total_hours),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )

        Spacer(modifier = Modifier.height(8.dp))

        ReportsDonutChart(totalHours = uiState.totalHours)

        Spacer(modifier = Modifier.height(24.dp))

        // Empty state message when no data
        if (!uiState.hasData) {
            Text(
                text = stringResource(R.string.reports_empty_state),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 16.dp),
            )
        }
    }
}

/**
 * Time range selector using segmented buttons (Day/Week/Month/Year).
 * Follows the same pattern as CalendarScreen's ViewSelector.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeRangeSelector(
    selectedRange: CalendarView,
    onRangeSelected: (CalendarView) -> Unit,
    modifier: Modifier = Modifier,
) {
    val views = CalendarView.entries

    SingleChoiceSegmentedButtonRow(
        modifier = modifier.fillMaxWidth(),
    ) {
        views.forEachIndexed { index, view ->
            SegmentedButton(
                selected = selectedRange == view,
                onClick = { onRangeSelected(view) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = views.size,
                ),
                icon = {},
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = PrimaryBlue,
                    activeContentColor = Color.White,
                ),
            ) {
                Text(text = stringResource(view.labelResId()))
            }
        }
    }
}

/**
 * Maps each CalendarView to its localized string resource ID for the reports time range.
 */
private fun CalendarView.labelResId(): Int = when (this) {
    CalendarView.Day -> R.string.calendar_view_day
    CalendarView.Week -> R.string.calendar_view_week
    CalendarView.Month -> R.string.calendar_view_month
    CalendarView.Year -> R.string.calendar_view_year
}

@Preview(showBackground = true)
@Composable
private fun ReportsContentPreview() {
    PlanixorTheme {
        ReportsContent(
            uiState = ReportsUiState(),
            onTimeRangeSelected = {},
        )
    }
}
