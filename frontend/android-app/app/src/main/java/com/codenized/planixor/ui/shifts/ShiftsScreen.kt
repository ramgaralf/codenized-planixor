package com.codenized.planixor.ui.shifts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.Shift
import com.codenized.planixor.ui.components.PlanixorFAB
import com.codenized.planixor.ui.components.ShiftCard
import com.codenized.planixor.ui.theme.PlanixorTheme

@Composable
fun ShiftsScreen(
    onNavigateToNewShift: () -> Unit,
    onNavigateToEditShift: (String) -> Unit,
    viewModel: ShiftsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ShiftsScreenContent(
        uiState = uiState,
        onNewShiftClick = onNavigateToNewShift,
        onEditClick = onNavigateToEditShift,
        onDeactivateConfirmed = { id -> viewModel.deactivate(id) },
        onActivateClick = { id -> viewModel.activate(id) },
        onDeleteConfirmed = { id -> viewModel.delete(id) },
    )
}

@Composable
internal fun ShiftsScreenContent(
    uiState: ShiftsUiState,
    onNewShiftClick: () -> Unit,
    onEditClick: (String) -> Unit,
    onDeactivateConfirmed: (String) -> Unit,
    onActivateClick: (String) -> Unit,
    onDeleteConfirmed: (String) -> Unit,
) {
    var deactivateShiftId by remember { mutableStateOf<String?>(null) }
    var deleteShiftId by remember { mutableStateOf<String?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        when (uiState) {
            is ShiftsUiState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            is ShiftsUiState.Error -> {
                Text(
                    text = stringResource(R.string.shifts_error_load),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            is ShiftsUiState.Empty -> {
                Text(
                    text = stringResource(R.string.shifts_empty),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            is ShiftsUiState.Success -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(
                        items = uiState.shifts,
                        key = { it.id },
                    ) { shift ->
                        ShiftCard(
                            shift = shift,
                            onEditClick = onEditClick,
                            onToggleActiveClick = { id ->
                                val targetShift = uiState.shifts.find { it.id == id }
                                if (targetShift != null && targetShift.isActive) {
                                    deactivateShiftId = id
                                } else {
                                    onActivateClick(id)
                                }
                            },
                            onDeleteClick = { id ->
                                deleteShiftId = id
                            },
                        )
                    }
                }
            }
        }

        // FAB for creating a new shift
        PlanixorFAB(
            onClick = onNewShiftClick,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
        )
    }

    // Deactivation confirmation dialog
    if (deactivateShiftId != null) {
        AlertDialog(
            onDismissRequest = { deactivateShiftId = null },
            title = {
                Text(text = stringResource(R.string.shifts_deactivate_confirm_title))
            },
            text = {
                Text(text = stringResource(R.string.shifts_deactivate_confirm_text))
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        deactivateShiftId?.let { onDeactivateConfirmed(it) }
                        deactivateShiftId = null
                    },
                ) {
                    Text(text = stringResource(R.string.shifts_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { deactivateShiftId = null }) {
                    Text(text = stringResource(R.string.shifts_cancel))
                }
            },
        )
    }

    // Deletion confirmation dialog
    if (deleteShiftId != null) {
        AlertDialog(
            onDismissRequest = { deleteShiftId = null },
            title = {
                Text(text = stringResource(R.string.shifts_delete_confirm_title))
            },
            text = {
                Text(text = stringResource(R.string.shifts_delete_confirm_text))
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        deleteShiftId?.let { onDeleteConfirmed(it) }
                        deleteShiftId = null
                    },
                ) {
                    Text(
                        text = stringResource(R.string.shifts_confirm),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteShiftId = null }) {
                    Text(text = stringResource(R.string.shifts_cancel))
                }
            },
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftsScreenLoadingPreview() {
    PlanixorTheme {
        ShiftsScreenContent(
            uiState = ShiftsUiState.Loading,
            onNewShiftClick = {},
            onEditClick = {},
            onDeactivateConfirmed = {},
            onActivateClick = {},
            onDeleteConfirmed = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftsScreenEmptyPreview() {
    PlanixorTheme {
        ShiftsScreenContent(
            uiState = ShiftsUiState.Empty,
            onNewShiftClick = {},
            onEditClick = {},
            onDeactivateConfirmed = {},
            onActivateClick = {},
            onDeleteConfirmed = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftsScreenSuccessPreview() {
    PlanixorTheme {
        ShiftsScreenContent(
            uiState = ShiftsUiState.Success(
                shifts = listOf(
                    Shift(
                        id = "1",
                        name = "Morning Shift",
                        icon = "☀️",
                        backgroundColor = "#10B981",
                        startTime = 480,
                        endTime = 960,
                        hoursWorked = 480,
                        isActive = true,
                        createdAt = System.currentTimeMillis(),
                        modifiedAt = System.currentTimeMillis(),
                        syncedAt = null,
                        isDeleted = false,
                    ),
                    Shift(
                        id = "2",
                        name = "Night Shift",
                        icon = "🌙",
                        backgroundColor = "#2563EB",
                        startTime = 1320,
                        endTime = 360,
                        hoursWorked = 480,
                        isActive = false,
                        createdAt = System.currentTimeMillis(),
                        modifiedAt = System.currentTimeMillis(),
                        syncedAt = null,
                        isDeleted = false,
                    ),
                ),
            ),
            onNewShiftClick = {},
            onEditClick = {},
            onDeactivateConfirmed = {},
            onActivateClick = {},
            onDeleteConfirmed = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftsScreenErrorPreview() {
    PlanixorTheme {
        ShiftsScreenContent(
            uiState = ShiftsUiState.Error("Could not load shifts"),
            onNewShiftClick = {},
            onEditClick = {},
            onDeactivateConfirmed = {},
            onActivateClick = {},
            onDeleteConfirmed = {},
        )
    }
}
