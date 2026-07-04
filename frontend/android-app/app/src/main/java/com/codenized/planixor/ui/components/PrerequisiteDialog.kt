package com.codenized.planixor.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Reusable dialog that informs the user about missing prerequisites
 * (shifts and/or reminders) before creating a calendar event.
 *
 * Displays a message indicating which prerequisites are missing,
 * navigation buttons for each missing type, and a dismiss/cancel button.
 *
 * Validates: Requirements 7.5, 7.6, 7.7
 */
@Composable
fun PrerequisiteDialog(
    missingShifts: Boolean,
    missingReminders: Boolean,
    onNavigateToShifts: () -> Unit,
    onNavigateToReminders: () -> Unit,
    onDismiss: () -> Unit,
) {
    val message = when {
        missingShifts && missingReminders -> stringResource(R.string.prerequisite_message_both)
        missingShifts -> stringResource(R.string.prerequisite_message_shifts)
        else -> stringResource(R.string.prerequisite_message_reminders)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.prerequisite_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
        },
        text = {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        confirmButton = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (missingShifts) {
                    Button(
                        onClick = onNavigateToShifts,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(text = stringResource(R.string.prerequisite_go_to_shifts))
                    }
                }
                if (missingReminders) {
                    Button(
                        onClick = onNavigateToReminders,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(text = stringResource(R.string.prerequisite_go_to_reminders))
                    }
                }
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(text = stringResource(R.string.common_cancel))
                }
            }
        },
    )
}

@Preview(showBackground = true)
@Composable
private fun PrerequisiteDialogBothMissingPreview() {
    PlanixorTheme {
        PrerequisiteDialog(
            missingShifts = true,
            missingReminders = true,
            onNavigateToShifts = {},
            onNavigateToReminders = {},
            onDismiss = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PrerequisiteDialogShiftsMissingPreview() {
    PlanixorTheme {
        PrerequisiteDialog(
            missingShifts = true,
            missingReminders = false,
            onNavigateToShifts = {},
            onNavigateToReminders = {},
            onDismiss = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PrerequisiteDialogRemindersMissingPreview() {
    PlanixorTheme {
        PrerequisiteDialog(
            missingShifts = false,
            missingReminders = true,
            onNavigateToShifts = {},
            onNavigateToReminders = {},
            onDismiss = {},
        )
    }
}
