package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.codenized.planixor.R
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Segmented control for switching between calendar views.
 * Displays only the views provided via the [views] parameter.
 * Uses `icon = {}` to hide the default checkmark on selected segment.
 *
 * @param activeView The currently selected calendar view.
 * @param onViewSelected Callback invoked when the user selects a different view.
 * @param views The list of available views to display. Defaults to all entries.
 * @param modifier Optional modifier.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ViewSelector(
    activeView: CalendarView,
    onViewSelected: (CalendarView) -> Unit,
    views: List<CalendarView> = CalendarView.entries,
    modifier: Modifier = Modifier,
) {
    SingleChoiceSegmentedButtonRow(
        modifier = modifier,
    ) {
        views.forEachIndexed { index, view ->
            SegmentedButton(
                selected = activeView == view,
                onClick = { onViewSelected(view) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = views.size,
                ),
                icon = {},
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = MaterialTheme.colorScheme.primary,
                    activeContentColor = Color.White,
                ),
            ) {
                Text(
                    text = stringResource(view.labelResId()),
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
    }
}

private fun CalendarView.labelResId(): Int = when (this) {
    CalendarView.Day -> R.string.calendar_view_day
    CalendarView.Week -> R.string.calendar_view_week
    CalendarView.Month -> R.string.calendar_view_month
    CalendarView.Year -> R.string.calendar_view_year
}

@Preview(showBackground = true)
@Composable
private fun ViewSelectorPreview() {
    PlanixorTheme {
        ViewSelector(
            activeView = CalendarView.Week,
            onViewSelected = {},
        )
    }
}
