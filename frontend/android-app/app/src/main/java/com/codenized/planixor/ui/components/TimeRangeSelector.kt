package com.codenized.planixor.ui.components

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
import com.codenized.planixor.ui.reports.ReportMode
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Segmented control for switching between Month and Year report modes.
 * Uses `icon = {}` to hide the default checkmark on selected segment.
 *
 * @param selectedMode The currently selected report mode.
 * @param onModeChange Callback invoked when the user selects a different mode.
 * @param modifier Optional modifier.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimeRangeSelector(
    selectedMode: ReportMode,
    onModeChange: (ReportMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    val modes = ReportMode.entries

    SingleChoiceSegmentedButtonRow(
        modifier = modifier.fillMaxWidth(),
    ) {
        modes.forEachIndexed { index, mode ->
            SegmentedButton(
                selected = selectedMode == mode,
                onClick = { onModeChange(mode) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = modes.size,
                ),
                icon = {},
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = MaterialTheme.colorScheme.primary,
                    activeContentColor = Color.White,
                ),
            ) {
                Text(
                    text = stringResource(mode.labelResId()),
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}

private fun ReportMode.labelResId(): Int = when (this) {
    ReportMode.MONTH -> R.string.reports_mode_month
    ReportMode.YEAR -> R.string.reports_mode_year
}

@Preview(showBackground = true)
@Composable
private fun TimeRangeSelectorPreview() {
    PlanixorTheme {
        TimeRangeSelector(
            selectedMode = ReportMode.MONTH,
            onModeChange = {},
        )
    }
}
