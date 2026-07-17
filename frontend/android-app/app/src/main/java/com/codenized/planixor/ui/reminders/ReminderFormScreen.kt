package com.codenized.planixor.ui.reminders

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.toColorInt
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.ui.components.ColorPickerDialog
import com.codenized.planixor.ui.components.EmojiPickerDialog
import com.codenized.planixor.ui.components.PropagationDialog
import com.codenized.planixor.ui.components.SeriesPropagationDialog
import com.codenized.planixor.ui.shifts.PropagationUiState
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Reminder form screen composable that supports create and edit modes.
 * Observes ReminderFormViewModel state and renders form fields with per-field validation errors.
 * Also observes propagation state to show the PropagationDialog after edit-mode saves.
 * This is a sub-screen: does NOT have its own Scaffold/TopAppBar (handled by global AppNavigation).
 */
@Composable
fun ReminderFormScreen(
    onNavigateBack: () -> Unit,
    viewModel: ReminderFormViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val propagationState by viewModel.propagationState.collectAsStateWithLifecycle()
    val seriesPropagationState by viewModel.seriesPropagationState.collectAsStateWithLifecycle()

    // Show series propagation dialog when frequency changed (takes priority over display-field dialog)
    if (seriesPropagationState is SeriesPropagationUiState.Showing) {
        val showing = seriesPropagationState as SeriesPropagationUiState.Showing
        SeriesPropagationDialog(
            isOpen = true,
            reminderName = showing.name,
            previousFrequency = showing.previousFrequency,
            newFrequency = showing.newFrequency,
            affectedEventCount = showing.count,
            onConfirm = viewModel::confirmSeriesPropagation,
            onDecline = viewModel::declineSeriesPropagation,
        )
    }

    // Show display-field propagation dialog when state is Showing
    if (propagationState is PropagationUiState.Showing) {
        val showing = propagationState as PropagationUiState.Showing
        PropagationDialog(
            isOpen = true,
            templateName = showing.name,
            templateType = "reminder",
            affectedEventCount = showing.count,
            onConfirm = viewModel::confirmPropagation,
            onDecline = viewModel::declinePropagation,
        )
    }

    if (uiState.shouldNavigateBack) {
        LaunchedEffect(Unit) {
            onNavigateBack()
        }
        return
    }

    if (uiState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator()
        }
    } else {
        ReminderFormContent(
            uiState = uiState,
            onFieldChange = viewModel::onFieldChange,
            onSubmit = { viewModel.onSubmit(onNavigateBack) },
            onCancel = onNavigateBack,
        )
    }
}

@Composable
internal fun ReminderFormContent(
    uiState: ReminderFormUiState,
    onFieldChange: (String, String) -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Name field
        ReminderNameField(
            value = uiState.name,
            error = uiState.nameError,
            onValueChange = { onFieldChange("name", it) },
        )

        // Icon field
        ReminderIconField(
            value = uiState.icon,
            error = uiState.iconError,
            onValueChange = { onFieldChange("icon", it) },
        )

        // Background color field
        ReminderColorField(
            value = uiState.backgroundColor,
            error = uiState.backgroundColorError,
            onValueChange = { onFieldChange("backgroundColor", it) },
        )

        // Series frequency selector
        ReminderFrequencyField(
            value = uiState.seriesFrequency,
            onValueChange = { onFieldChange("seriesFrequency", it) },
        )

        // Series end date picker (visible only when frequency is not "never")
        if (uiState.seriesFrequency != "never") {
            ReminderEndDateField(
                value = uiState.seriesEndDate,
                onValueChange = { onFieldChange("seriesEndDate", it) },
            )
        }

        // Save error banner
        if (uiState.saveError != null) {
            Text(
                text = stringResource(R.string.reminder_form_error_save),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(8.dp),
                    )
                    .padding(12.dp),
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f),
            ) {
                Text(text = stringResource(R.string.reminder_form_cancel))
            }
            Button(
                onClick = onSubmit,
                modifier = Modifier.weight(1f),
                enabled = !uiState.isSaving,
            ) {
                if (uiState.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text(text = stringResource(R.string.reminder_form_save))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun ReminderNameField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
) {
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(stringResource(R.string.reminder_form_name_label)) },
            placeholder = { Text(stringResource(R.string.reminder_form_name_placeholder)) },
            singleLine = true,
            isError = error != null,
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            ReminderValidationErrorText(error)
        }
    }
}

@Composable
private fun ReminderIconField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column {
        Text(
            text = stringResource(R.string.reminder_form_icon_label),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(8.dp),
                )
                .clickable { showPicker = true },
            contentAlignment = Alignment.Center,
        ) {
            if (value.isNotEmpty()) {
                Text(text = value, fontSize = 24.sp)
            } else {
                Text(text = "➕", fontSize = 24.sp)
            }
        }
        if (error != null) {
            ReminderValidationErrorText(error)
        }
    }

    if (showPicker) {
        EmojiPickerDialog(
            selectedEmoji = value,
            onEmojiSelected = { emoji ->
                onValueChange(emoji)
                showPicker = false
            },
            onDismiss = { showPicker = false },
        )
    }
}

@Composable
private fun ReminderColorField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column {
        Text(
            text = stringResource(R.string.reminder_form_color_label),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))

        // Selected color preview
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(
                    if (value.isNotEmpty()) parseHexColor(value)
                    else MaterialTheme.colorScheme.surfaceVariant,
                )
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.outline,
                    shape = CircleShape,
                )
                .clickable { showPicker = true },
            contentAlignment = Alignment.Center,
        ) {
            if (value.isEmpty()) {
                Text(
                    text = "🎨",
                    fontSize = 20.sp,
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.reminder_form_color_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (error != null) {
            ReminderValidationErrorText(error)
        }
    }

    if (showPicker) {
        ColorPickerDialog(
            selectedColor = value,
            onColorSelected = { hex ->
                onValueChange(hex)
                showPicker = false
            },
            onDismiss = { showPicker = false },
        )
    }
}

@Composable
private fun ReminderFrequencyField(
    value: String,
    onValueChange: (String) -> Unit,
) {
    val options = listOf(
        "never" to stringResource(R.string.reminder_form_frequency_never),
        "weekly" to stringResource(R.string.reminder_form_frequency_weekly),
        "monthly" to stringResource(R.string.reminder_form_frequency_monthly),
        "yearly" to stringResource(R.string.reminder_form_frequency_yearly),
    )

    Column {
        Text(
            text = stringResource(R.string.reminder_form_frequency_label),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        // Row 1: Never + Weekly
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            options.take(2).forEach { (key, label) ->
                FrequencyButton(
                    key = key,
                    label = label,
                    isSelected = value == key,
                    onClick = { onValueChange(key) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        // Row 2: Monthly + Yearly
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            options.drop(2).forEach { (key, label) ->
                FrequencyButton(
                    key = key,
                    label = label,
                    isSelected = value == key,
                    onClick = { onValueChange(key) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun FrequencyButton(
    key: String,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        colors = if (isSelected) {
            ButtonDefaults.outlinedButtonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            )
        } else {
            ButtonDefaults.outlinedButtonColors()
        },
        border = if (isSelected) {
            null
        } else {
            BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outline,
            )
        },
        contentPadding = PaddingValues(
            horizontal = 12.dp,
            vertical = 10.dp,
        ),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            maxLines = 1,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReminderEndDateField(
    value: String,
    onValueChange: (String) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    val displayText = remember(value) {
        if (value.isNotEmpty()) {
            try {
                val date = java.time.LocalDate.parse(value)
                val formatter = java.time.format.DateTimeFormatter.ofLocalizedDate(java.time.format.FormatStyle.MEDIUM)
                date.format(formatter)
            } catch (_: Exception) {
                value
            }
        } else {
            ""
        }
    }

    Column {
        Text(
            text = stringResource(R.string.reminder_form_end_date_label),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedButton(
            onClick = { showPicker = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Text(
                text = displayText.ifEmpty { stringResource(R.string.reminder_form_end_date_label) },
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Start,
            )
        }
    }

    if (showPicker) {
        val initialDate = if (value.isNotEmpty()) {
            try {
                java.time.LocalDate.parse(value)
            } catch (_: Exception) {
                java.time.LocalDate.now().plusYears(1)
            }
        } else {
            java.time.LocalDate.now().plusYears(1)
        }

        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = initialDate.atStartOfDay(java.time.ZoneOffset.UTC)
                .toInstant().toEpochMilli()
        )

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val selected = java.time.Instant.ofEpochMilli(millis)
                            .atZone(java.time.ZoneOffset.UTC)
                            .toLocalDate()
                        onValueChange(selected.toString())
                    }
                    showPicker = false
                }) {
                    Text(stringResource(R.string.reminder_form_save))
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text(stringResource(R.string.reminder_form_cancel))
                }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

/**
 * Maps reminder validation error keys to localized string resources.
 */
@Composable
private fun ReminderValidationErrorText(errorKey: String) {
    val message = when (errorKey) {
        "reminder.validation.name.required" -> stringResource(R.string.reminder_validation_name_required)
        "reminder.validation.name.maxLength" -> stringResource(R.string.reminder_validation_name_max_length)
        "reminder.validation.icon.required" -> stringResource(R.string.reminder_validation_icon_required)
        "reminder.validation.color.required" -> stringResource(R.string.reminder_validation_color_required)
        else -> errorKey
    }
    Spacer(modifier = Modifier.height(4.dp))
    Text(
        text = message,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.error,
    )
}

private fun parseHexColor(hex: String): Color {
    return try {
        Color(hex.toColorInt())
    } catch (e: IllegalArgumentException) {
        Color.Gray
    }
}

@Preview(showBackground = true)
@Composable
private fun ReminderFormScreenCreatePreview() {
    PlanixorTheme {
        ReminderFormContent(
            uiState = ReminderFormUiState(),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReminderFormScreenEditPreview() {
    PlanixorTheme {
        ReminderFormContent(
            uiState = ReminderFormUiState(
                name = "Daily Meeting",
                icon = "📅",
                backgroundColor = "#10B981",
                seriesFrequency = "weekly",
                isValid = true,
                mode = ReminderFormMode.Edit("123"),
            ),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReminderFormScreenWithErrorsPreview() {
    PlanixorTheme {
        ReminderFormContent(
            uiState = ReminderFormUiState(
                nameError = "reminder.validation.name.required",
                iconError = "reminder.validation.icon.required",
                backgroundColorError = "reminder.validation.color.required",
            ),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReminderFormScreenSaveErrorPreview() {
    PlanixorTheme {
        ReminderFormContent(
            uiState = ReminderFormUiState(
                name = "Test Reminder",
                icon = "🔔",
                backgroundColor = "#2563EB",
                isValid = true,
                saveError = "Could not save the reminder",
            ),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}
