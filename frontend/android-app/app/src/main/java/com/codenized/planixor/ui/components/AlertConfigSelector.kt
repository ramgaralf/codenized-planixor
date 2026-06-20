package com.codenized.planixor.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Alert offset option with its corresponding minute value and string resource ID.
 */
private data class AlertOption(
    val offset: Int,
    val labelResId: Int,
)

private val ALERT_OPTIONS = listOf(
    AlertOption(offset = 0, labelResId = R.string.notification_alert_at_start),
    AlertOption(offset = 10, labelResId = R.string.notification_alert_10_min),
    AlertOption(offset = 60, labelResId = R.string.notification_alert_1_hour),
    AlertOption(offset = 1440, labelResId = R.string.notification_alert_1_day),
)

/**
 * Multi-select chip group for configuring notification alert offsets on a calendar event.
 * Allows the user to select zero or more alert options (at start, 10 min before, 1 hour before, 1 day before).
 *
 * Only visible when the event start is strictly in the future (controlled by parent).
 *
 * @param selectedOffsets The currently selected alert offset values (e.g., [0, 10, 60]).
 * @param onOffsetsChanged Callback invoked when the selection changes.
 * @param modifier Optional modifier for the composable.
 */
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun AlertConfigSelector(
    selectedOffsets: List<Int>,
    onOffsetsChanged: (List<Int>) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Text(
            text = stringResource(R.string.alert_config_section_title),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ALERT_OPTIONS.forEach { option ->
                val isSelected = option.offset in selectedOffsets
                FilterChip(
                    selected = isSelected,
                    onClick = {
                        val updated = if (isSelected) {
                            selectedOffsets - option.offset
                        } else {
                            selectedOffsets + option.offset
                        }
                        onOffsetsChanged(updated)
                    },
                    label = { Text(text = stringResource(option.labelResId)) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ),
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun AlertConfigSelectorPreview() {
    PlanixorTheme {
        AlertConfigSelector(
            selectedOffsets = listOf(0, 60),
            onOffsetsChanged = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun AlertConfigSelectorEmptyPreview() {
    PlanixorTheme {
        AlertConfigSelector(
            selectedOffsets = emptyList(),
            onOffsetsChanged = {},
        )
    }
}
