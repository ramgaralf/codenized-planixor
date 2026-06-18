package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.codenized.planixor.R
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Compact segmented control that lets the user switch between Day, Week, Month, and Year views.
 * Active segment is highlighted with primary-blue.
 *
 * @param activeView The currently selected calendar view.
 * @param onViewSelected Callback invoked when the user selects a different view.
 * @param modifier Optional modifier.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ViewSelector(
    activeView: CalendarView,
    onViewSelected: (CalendarView) -> Unit,
    modifier: Modifier = Modifier,
) {
    val views = CalendarView.entries

    SingleChoiceSegmentedButtonRow(
        modifier = modifier.fillMaxWidth(),
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
                    activeContentColor = androidx.compose.ui.graphics.Color.White,
                ),
            ) {
                Text(text = stringResource(view.labelResId()))
            }
        }
    }
}

/**
 * Maps each CalendarView to its localized string resource ID.
 */
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
