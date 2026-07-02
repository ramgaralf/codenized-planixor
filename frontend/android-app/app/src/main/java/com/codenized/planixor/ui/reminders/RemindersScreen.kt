package com.codenized.planixor.ui.reminders

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.Reminder
import com.codenized.planixor.ui.components.ReminderCard
import com.codenized.planixor.ui.theme.PlanixorTheme

@Composable
fun RemindersScreen(
    onNavigateToNewReminder: () -> Unit,
    onNavigateToEditReminder: (String) -> Unit,
    viewModel: RemindersViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    RemindersScreenContent(
        uiState = uiState,
        onEditClick = onNavigateToEditReminder,
        onToggleActiveClick = { id ->
            val reminder = uiState.reminders.find { it.id == id }
            if (reminder != null && reminder.isActive) {
                viewModel.requestDeactivate(id)
            } else {
                viewModel.activate(id)
            }
        },
        onDeleteClick = { id -> viewModel.requestDelete(id) },
        onConfirmDeactivate = { viewModel.confirmDeactivate() },
        onDismissDeactivate = { viewModel.dismissDeactivate() },
        onConfirmDelete = { viewModel.confirmDelete() },
        onDismissDelete = { viewModel.dismissDelete() },
    )
}

@Composable
internal fun RemindersScreenContent(
    uiState: RemindersUiState,
    onEditClick: (String) -> Unit,
    onToggleActiveClick: (String) -> Unit,
    onDeleteClick: (String) -> Unit,
    onConfirmDeactivate: () -> Unit,
    onDismissDeactivate: () -> Unit,
    onConfirmDelete: () -> Unit,
    onDismissDelete: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        when {
            uiState.isLoading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            uiState.error != null -> {
                Text(
                    text = stringResource(R.string.reminders_error_load),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            uiState.reminders.isEmpty() -> {
                Text(
                    text = stringResource(R.string.reminders_empty),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(
                        items = uiState.reminders,
                        key = { it.id },
                    ) { reminder ->
                        ReminderCard(
                            reminder = reminder,
                            onEditClick = onEditClick,
                            onToggleActiveClick = onToggleActiveClick,
                            onDeleteClick = onDeleteClick,
                        )
                    }
                }
            }
        }
    }

    // Deactivation confirmation dialog
    val deactivateReminder = uiState.confirmDeactivateId?.let { id ->
        uiState.reminders.find { it.id == id }
    }
    if (deactivateReminder != null) {
        AlertDialog(
            onDismissRequest = onDismissDeactivate,
            title = {
                Text(text = stringResource(R.string.reminders_deactivate_confirm_title))
            },
            text = {
                Text(
                    text = stringResource(
                        R.string.reminders_deactivate_confirm_text,
                        deactivateReminder.name,
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = onConfirmDeactivate) {
                    Text(text = stringResource(R.string.reminders_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = onDismissDeactivate) {
                    Text(text = stringResource(R.string.reminders_cancel))
                }
            },
        )
    }

    // Delete confirmation dialog
    val deleteReminder = uiState.confirmDeleteId?.let { id ->
        uiState.reminders.find { it.id == id }
    }
    if (deleteReminder != null) {
        AlertDialog(
            onDismissRequest = onDismissDelete,
            title = {
                Text(text = stringResource(R.string.reminders_delete_confirm_title))
            },
            text = {
                Text(
                    text = stringResource(
                        R.string.reminders_delete_confirm_text,
                        deleteReminder.name,
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = onConfirmDelete) {
                    Text(
                        text = stringResource(R.string.reminders_confirm),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = onDismissDelete) {
                    Text(text = stringResource(R.string.reminders_cancel))
                }
            },
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun RemindersScreenLoadingPreview() {
    PlanixorTheme {
        RemindersScreenContent(
            uiState = RemindersUiState(isLoading = true),
            onEditClick = {},
            onToggleActiveClick = {},
            onDeleteClick = {},
            onConfirmDeactivate = {},
            onDismissDeactivate = {},
            onConfirmDelete = {},
            onDismissDelete = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun RemindersScreenEmptyPreview() {
    PlanixorTheme {
        RemindersScreenContent(
            uiState = RemindersUiState(isLoading = false, reminders = emptyList()),
            onEditClick = {},
            onToggleActiveClick = {},
            onDeleteClick = {},
            onConfirmDeactivate = {},
            onDismissDeactivate = {},
            onConfirmDelete = {},
            onDismissDelete = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun RemindersScreenSuccessPreview() {
    PlanixorTheme {
        RemindersScreenContent(
            uiState = RemindersUiState(
                isLoading = false,
                reminders = listOf(
                    Reminder(
                        id = "1",
                        name = "Take Medicine",
                        icon = "\uD83D\uDC8A",
                        backgroundColor = "#10B981",
                        isActive = true,
                        createdAt = System.currentTimeMillis(),
                        modifiedAt = System.currentTimeMillis(),
                        syncedAt = null,
                        isDeleted = false,
                    ),
                    Reminder(
                        id = "2",
                        name = "Water Plants",
                        icon = "\uD83C\uDF31",
                        backgroundColor = "#2563EB",
                        isActive = false,
                        createdAt = System.currentTimeMillis(),
                        modifiedAt = System.currentTimeMillis(),
                        syncedAt = null,
                        isDeleted = false,
                    ),
                ),
            ),
            onEditClick = {},
            onToggleActiveClick = {},
            onDeleteClick = {},
            onConfirmDeactivate = {},
            onDismissDeactivate = {},
            onConfirmDelete = {},
            onDismissDelete = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun RemindersScreenErrorPreview() {
    PlanixorTheme {
        RemindersScreenContent(
            uiState = RemindersUiState(isLoading = false, error = "Could not load reminders"),
            onEditClick = {},
            onToggleActiveClick = {},
            onDeleteClick = {},
            onConfirmDeactivate = {},
            onDismissDeactivate = {},
            onConfirmDelete = {},
            onDismissDelete = {},
        )
    }
}
