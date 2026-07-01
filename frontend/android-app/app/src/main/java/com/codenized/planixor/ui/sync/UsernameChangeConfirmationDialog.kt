package com.codenized.planixor.ui.sync

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R

/**
 * Confirmation dialog displayed when a username change is detected during sync configuration.
 * Lists the data categories that will be deleted and requires explicit user confirmation.
 * Cancel is the default/highlighted action to prevent accidental data loss.
 *
 * @param previousUsername The username currently stored in the local config
 * @param newUsername The new username returned by the validation endpoint
 * @param isDeletingData Whether the data deletion is currently in progress
 * @param onConfirm Called when the user confirms the username change and data deletion
 * @param onCancel Called when the user cancels (retains existing config)
 */
@Composable
fun UsernameChangeConfirmationDialog(
    previousUsername: String,
    newUsername: String,
    isDeletingData: Boolean,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isDeletingData) onCancel() },
        title = {
            Text(
                text = stringResource(R.string.sync_username_change_title),
                style = MaterialTheme.typography.headlineSmall,
            )
        },
        text = {
            Column {
                Text(
                    text = stringResource(
                        R.string.sync_username_change_message,
                        previousUsername,
                        newUsername,
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = stringResource(R.string.sync_username_change_data_categories),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "\u2022 ${stringResource(R.string.sync_username_change_category_calendar_events)}",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    text = "\u2022 ${stringResource(R.string.sync_username_change_category_shifts)}",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    text = "\u2022 ${stringResource(R.string.sync_username_change_category_reminders)}",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    text = "\u2022 ${stringResource(R.string.sync_username_change_category_notification_records)}",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    text = "\u2022 ${stringResource(R.string.sync_username_change_category_annual_hours)}",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Cancel button — highlighted as primary/default to prevent accidental data loss
                Button(
                    onClick = onCancel,
                    enabled = !isDeletingData,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(stringResource(R.string.sync_username_change_cancel))
                }

                // Confirm button — outlined/destructive (secondary action)
                OutlinedButton(
                    onClick = onConfirm,
                    enabled = !isDeletingData,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                ) {
                    if (isDeletingData) {
                        CircularProgressIndicator(
                            modifier = Modifier.height(20.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.error,
                        )
                    } else {
                        Text(stringResource(R.string.sync_username_change_confirm))
                    }
                }
            }
        },
    )
}
