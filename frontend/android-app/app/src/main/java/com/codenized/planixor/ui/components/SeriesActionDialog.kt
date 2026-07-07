package com.codenized.planixor.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R

/**
 * Action type for the series action dialog.
 */
enum class SeriesActionType {
    Edit,
    Delete,
}

/**
 * Dialog that asks the user whether an edit or delete action should apply
 * to only the current event or to all future events in the series.
 *
 * Uses vertically stacked full-width buttons for better readability
 * with long localized text strings.
 */
@Composable
fun SeriesActionDialog(
    actionType: SeriesActionType,
    onOnlyThis: () -> Unit,
    onAllInSeries: () -> Unit,
    onDismiss: () -> Unit,
) {
    val title = when (actionType) {
        SeriesActionType.Edit -> stringResource(R.string.calendar_series_edit_title)
        SeriesActionType.Delete -> stringResource(R.string.calendar_series_delete_title)
    }
    val description = when (actionType) {
        SeriesActionType.Edit -> stringResource(R.string.calendar_series_edit_description)
        SeriesActionType.Delete -> stringResource(R.string.calendar_series_delete_description)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
            )
        },
        text = {
            Column {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(20.dp))

                // Full-width stacked buttons for better readability
                OutlinedButton(
                    onClick = onOnlyThis,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.calendar_series_only_this),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onAllInSeries,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.calendar_series_all_in_series),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.common_cancel),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
        // No standard confirm/dismiss buttons — they're in the text content for vertical layout
        confirmButton = {},
    )
}
