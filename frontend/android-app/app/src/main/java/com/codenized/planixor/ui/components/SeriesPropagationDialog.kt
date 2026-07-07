package com.codenized.planixor.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.util.Calendar

/**
 * Series propagation dialog that asks the user whether to update calendar events
 * after a reminder's series frequency has changed.
 *
 * Displays the previous and new frequency values, the affected event count,
 * and provides confirm/decline actions.
 *
 * Validates: Requirements 3.2, 7.5
 */
@Composable
fun SeriesPropagationDialog(
    isOpen: Boolean,
    reminderName: String,
    previousFrequency: String,
    newFrequency: String,
    affectedEventCount: Int,
    onConfirm: () -> Unit,
    onDecline: () -> Unit,
) {
    if (!isOpen) return

    val currentYear = Calendar.getInstance().get(Calendar.YEAR)

    val previousLabel = frequencyDisplayLabel(previousFrequency)
    val newLabel = frequencyDisplayLabel(newFrequency)

    AlertDialog(
        onDismissRequest = onDecline,
        title = {
            Text(
                text = stringResource(R.string.reminder_propagation_series_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
        },
        text = {
            Column {
                Text(
                    text = stringResource(
                        R.string.reminder_propagation_series_description,
                        reminderName,
                        previousLabel,
                        newLabel,
                        affectedEventCount,
                        currentYear,
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, alignment = androidx.compose.ui.Alignment.End),
            ) {
                OutlinedButton(onClick = onDecline) {
                    Text(text = stringResource(R.string.reminder_propagation_series_decline))
                }
                Button(onClick = onConfirm) {
                    Text(text = stringResource(R.string.reminder_propagation_series_confirm))
                }
            }
        },
    )
}

/**
 * Maps a frequency value to its user-facing display label.
 * Used within the dialog to show previous/new frequency names.
 */
@Composable
private fun frequencyDisplayLabel(frequency: String): String {
    return when (frequency) {
        "never" -> stringResource(R.string.reminder_form_frequency_never)
        "weekly" -> stringResource(R.string.reminder_form_frequency_weekly)
        "monthly" -> stringResource(R.string.reminder_form_frequency_monthly)
        "yearly" -> stringResource(R.string.reminder_form_frequency_yearly)
        else -> frequency
    }
}

@Preview(showBackground = true)
@Composable
private fun SeriesPropagationDialogNeverToWeeklyPreview() {
    PlanixorTheme {
        SeriesPropagationDialog(
            isOpen = true,
            reminderName = "Take Medicine",
            previousFrequency = "never",
            newFrequency = "weekly",
            affectedEventCount = 3,
            onConfirm = {},
            onDecline = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SeriesPropagationDialogWeeklyToNeverPreview() {
    PlanixorTheme {
        SeriesPropagationDialog(
            isOpen = true,
            reminderName = "Tomar medicina",
            previousFrequency = "weekly",
            newFrequency = "never",
            affectedEventCount = 42,
            onConfirm = {},
            onDecline = {},
        )
    }
}
