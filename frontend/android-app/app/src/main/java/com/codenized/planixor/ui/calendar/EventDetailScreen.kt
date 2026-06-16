package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.calendar.components.EventTypeOption
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate

/**
 * Event detail screen that reuses the EventFormScreen in edit mode.
 * Adds a delete button that triggers a confirmation dialog.
 *
 * @param uiState The form UI state (pre-populated with existing event data).
 * @param eventName The name of the event (for deletion dialog).
 * @param onEventTypeSelected Callback when event type is changed.
 * @param onDaySelected Callback when day is changed.
 * @param onStartTimeSelected Callback when start time is changed.
 * @param onEndTimeSelected Callback when end time is changed.
 * @param onNotesChanged Callback when notes are changed.
 * @param onSave Callback for save action.
 * @param onCancel Callback for cancel/back action.
 * @param onDelete Callback for confirmed deletion.
 * @param modifier Optional modifier.
 */
@Composable
fun EventDetailScreen(
    uiState: EventFormUiState,
    eventName: String,
    onEventTypeSelected: (eventType: String, eventTypeId: String) -> Unit,
    onDaySelected: (LocalDate) -> Unit,
    onStartTimeSelected: (hours: Int, minutes: Int) -> Unit,
    onEndTimeSelected: (hours: Int, minutes: Int) -> Unit,
    onNotesChanged: (String) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (uiState.isLoading) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator()
        }
        return
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        // Reuse EventFormScreen for editing
        EventFormScreen(
            uiState = uiState,
            onEventTypeSelected = onEventTypeSelected,
            onDaySelected = onDaySelected,
            onStartTimeSelected = onStartTimeSelected,
            onEndTimeSelected = onEndTimeSelected,
            onNotesChanged = onNotesChanged,
            onSave = onSave,
            onCancel = onCancel,
            modifier = Modifier.weight(1f),
        )

        // Delete button
        Spacer(modifier = Modifier.height(8.dp))
        Button(
            onClick = { showDeleteDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError,
            ),
        ) {
            Text(text = stringResource(R.string.event_form_action_delete))
        }
        Spacer(modifier = Modifier.height(16.dp))
    }

    // Deletion confirmation dialog
    if (showDeleteDialog) {
        DeleteConfirmationDialog(
            eventName = eventName,
            onConfirm = {
                showDeleteDialog = false
                onDelete()
            },
            onDismiss = { showDeleteDialog = false },
        )
    }
}

/**
 * Confirmation dialog for event deletion.
 * Includes the event name for clarity.
 *
 * @param eventName The name of the event to be deleted.
 * @param onConfirm Callback when user confirms deletion.
 * @param onDismiss Callback when user dismisses the dialog.
 */
@Composable
fun DeleteConfirmationDialog(
    eventName: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = stringResource(R.string.event_detail_delete_title))
        },
        text = {
            Text(
                text = stringResource(R.string.event_detail_delete_text, eventName),
            )
        },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
            ) {
                Text(
                    text = stringResource(R.string.event_detail_confirm),
                    color = MaterialTheme.colorScheme.error,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.event_detail_cancel))
            }
        },
    )
}

@Preview(showBackground = true)
@Composable
private fun EventDetailScreenPreview() {
    PlanixorTheme {
        EventDetailScreen(
            uiState = EventFormUiState(
                eventType = "shift",
                eventTypeId = "1",
                day = LocalDate.of(2024, 6, 15),
                startTimeHours = 8,
                startTimeMinutes = 0,
                endTimeHours = 16,
                endTimeMinutes = 0,
                notes = "Morning shift with team",
                derivedName = "Mañana",
                derivedIcon = "☀️",
                derivedBackgroundColor = "#10B981",
                eventTypeOptions = listOf(
                    EventTypeOption(
                        id = "1",
                        eventType = "shift",
                        name = "Mañana",
                        icon = "☀️",
                        backgroundColor = "#10B981",
                        displayLabel = "Turno: Mañana",
                    ),
                ),
            ),
            eventName = "Mañana",
            onEventTypeSelected = { _, _ -> },
            onDaySelected = {},
            onStartTimeSelected = { _, _ -> },
            onEndTimeSelected = { _, _ -> },
            onNotesChanged = {},
            onSave = {},
            onCancel = {},
            onDelete = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun DeleteConfirmationDialogPreview() {
    PlanixorTheme {
        DeleteConfirmationDialog(
            eventName = "Mañana",
            onConfirm = {},
            onDismiss = {},
        )
    }
}
