package com.codenized.planixor.ui.reports

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme

private const val MIN_HOURS = 1
private const val MAX_HOURS = 8784

/**
 * Centered dialog for configuring annual working hours for a given year.
 * Allows numeric-only input with range validation (1–8784).
 *
 * Behavior:
 * - Pre-populates input with existing value or shows placeholder "1800"
 * - Empty submit + existing config → onDelete (soft-delete)
 * - Empty submit + no existing config → onDismiss (no-op)
 * - Dismisses on cancel, outside tap, or back button without saving
 * - Save button disabled when input is non-empty but invalid
 */
@Composable
fun AnnualConfigDialog(
    isOpen: Boolean,
    selectedYear: Int,
    existingValue: Int?,
    onSave: (Int) -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
) {
    if (!isOpen) return

    var inputText by remember(isOpen) {
        mutableStateOf(existingValue?.toString() ?: "")
    }

    val isInputEmpty = inputText.isBlank()
    val parsedValue = inputText.toIntOrNull()
    val isValid = isInputEmpty || (parsedValue != null && parsedValue in MIN_HOURS..MAX_HOURS)
    val showError = !isInputEmpty && !isValid

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text(
                    text = stringResource(R.string.annual_config_title),
                    style = MaterialTheme.typography.headlineSmall,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = stringResource(R.string.annual_config_subtitle, selectedYear),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        text = {
            Column {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { newValue ->
                        // Filter to digits only
                        inputText = newValue.filter { it.isDigit() }
                    },
                    label = { Text(stringResource(R.string.annual_config_input_label)) },
                    placeholder = { Text(stringResource(R.string.annual_config_input_placeholder)) },
                    singleLine = true,
                    isError = showError,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
                if (showError) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = stringResource(R.string.annual_config_range_error),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (isInputEmpty) {
                        if (existingValue != null) {
                            onDelete()
                        } else {
                            onDismiss()
                        }
                    } else if (parsedValue != null && parsedValue in MIN_HOURS..MAX_HOURS) {
                        onSave(parsedValue)
                    }
                },
                enabled = isValid,
            ) {
                Text(stringResource(R.string.annual_config_save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.annual_config_cancel))
            }
        },
    )
}

@Preview(showBackground = true)
@Composable
private fun AnnualConfigDialogPreviewEmpty() {
    PlanixorTheme {
        AnnualConfigDialog(
            isOpen = true,
            selectedYear = 2025,
            existingValue = null,
            onSave = {},
            onDelete = {},
            onDismiss = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun AnnualConfigDialogPreviewExisting() {
    PlanixorTheme {
        AnnualConfigDialog(
            isOpen = true,
            selectedYear = 2025,
            existingValue = 1800,
            onSave = {},
            onDelete = {},
            onDismiss = {},
        )
    }
}
