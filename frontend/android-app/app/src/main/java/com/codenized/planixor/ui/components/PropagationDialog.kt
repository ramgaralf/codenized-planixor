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
 * Propagation dialog that asks the user whether to propagate template changes
 * (shift or reminder) to affected calendar events for the current year.
 *
 * Displays:
 * - Title
 * - Description with template name and current year (based on templateType)
 * - Affected event count
 * - Confirm (primary) and Decline (outlined) buttons
 *
 * Requirements: 6.2, 7.2, 8.3
 */
@Composable
fun PropagationDialog(
    isOpen: Boolean,
    templateName: String,
    templateType: String,
    affectedEventCount: Int,
    onConfirm: () -> Unit,
    onDecline: () -> Unit,
) {
    if (!isOpen) return

    val currentYear = Calendar.getInstance().get(Calendar.YEAR)

    val description = if (templateType == "shift") {
        stringResource(R.string.propagation_dialog_description_shift, templateName, currentYear)
    } else {
        stringResource(R.string.propagation_dialog_description_reminder, templateName, currentYear)
    }

    AlertDialog(
        onDismissRequest = onDecline,
        title = {
            Text(
                text = stringResource(R.string.propagation_dialog_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
        },
        text = {
            Column {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.propagation_dialog_affected_count, affectedEventCount),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, alignment = androidx.compose.ui.Alignment.End),
            ) {
                OutlinedButton(onClick = onDecline) {
                    Text(text = stringResource(R.string.propagation_dialog_decline))
                }
                Button(onClick = onConfirm) {
                    Text(text = stringResource(R.string.propagation_dialog_confirm))
                }
            }
        },
    )
}

@Preview(showBackground = true)
@Composable
private fun PropagationDialogShiftPreview() {
    PlanixorTheme {
        PropagationDialog(
            isOpen = true,
            templateName = "Mañana",
            templateType = "shift",
            affectedEventCount = 15,
            onConfirm = {},
            onDecline = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PropagationDialogReminderPreview() {
    PlanixorTheme {
        PropagationDialog(
            isOpen = true,
            templateName = "Tomar medicina",
            templateType = "reminder",
            affectedEventCount = 42,
            onConfirm = {},
            onDecline = {},
        )
    }
}
