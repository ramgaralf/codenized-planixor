package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.codenized.planixor.R
import com.codenized.planixor.ui.calendar.components.EventTypeOption
import com.codenized.planixor.ui.calendar.components.EventTypeSelector
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * UI state for the event form.
 */
data class EventFormUiState(
    val eventType: String? = null,
    val eventTypeId: String? = null,
    val day: LocalDate? = null,
    val startTimeHours: Int? = null,
    val startTimeMinutes: Int? = null,
    val endTimeHours: Int? = null,
    val endTimeMinutes: Int? = null,
    val notes: String = "",
    val derivedName: String = "",
    val derivedIcon: String = "",
    val derivedBackgroundColor: String = "",
    val eventTypeOptions: List<EventTypeOption> = emptyList(),
    val errors: Map<String, String> = emptyMap(),
    val formError: String? = null,
    val isSubmitting: Boolean = false,
    val isLoading: Boolean = false,
)

/**
 * Event form screen composable for creating or editing calendar events.
 * Displays the same fields and validation as the React Web counterpart.
 *
 * @param uiState The current form UI state.
 * @param onEventTypeSelected Callback when event type is selected.
 * @param onDaySelected Callback when day is selected.
 * @param onStartTimeSelected Callback when start time is selected.
 * @param onEndTimeSelected Callback when end time is selected.
 * @param onNotesChanged Callback when notes text changes.
 * @param onSave Callback for save action.
 * @param onCancel Callback for cancel action.
 * @param modifier Optional modifier.
 */
@Composable
fun EventFormScreen(
    uiState: EventFormUiState,
    onEventTypeSelected: (eventType: String, eventTypeId: String) -> Unit,
    onDaySelected: (LocalDate) -> Unit,
    onStartTimeSelected: (hours: Int, minutes: Int) -> Unit,
    onEndTimeSelected: (hours: Int, minutes: Int) -> Unit,
    onNotesChanged: (String) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (uiState.isLoading) {
        Column(
            modifier = modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator()
        }
        return
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Event Type Selector
        EventTypeSelector(
            options = uiState.eventTypeOptions,
            selectedId = uiState.eventTypeId,
            error = uiState.errors["eventType"],
            onSelected = onEventTypeSelected,
            modifier = Modifier.fillMaxWidth(),
        )

        // Derived fields (read-only) — shown when a type is selected
        if (uiState.derivedName.isNotBlank()) {
            DerivedFieldsDisplay(
                name = uiState.derivedName,
                icon = uiState.derivedIcon,
                backgroundColor = uiState.derivedBackgroundColor,
            )
        }

        // Day picker
        DayPickerField(
            selectedDay = uiState.day,
            error = uiState.errors["day"],
            onDaySelected = onDaySelected,
        )

        // Start time picker
        TimePickerField(
            label = stringResource(R.string.event_form_field_start_time),
            hours = uiState.startTimeHours,
            minutes = uiState.startTimeMinutes,
            error = uiState.errors["startTime"],
            onTimeSelected = onStartTimeSelected,
        )

        // End time picker
        TimePickerField(
            label = stringResource(R.string.event_form_field_end_time),
            hours = uiState.endTimeHours,
            minutes = uiState.endTimeMinutes,
            error = uiState.errors["endTime"],
            onTimeSelected = onEndTimeSelected,
        )

        // Notes field
        NotesField(
            value = uiState.notes,
            error = uiState.errors["notes"],
            onValueChange = onNotesChanged,
        )

        // Form-level error (e.g., one-shift-per-day)
        if (uiState.formError != null) {
            Text(
                text = uiState.formError,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
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
                Text(text = stringResource(R.string.event_form_action_cancel))
            }
            Button(
                onClick = onSave,
                modifier = Modifier.weight(1f),
                enabled = !uiState.isSubmitting,
            ) {
                if (uiState.isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text(text = stringResource(R.string.event_form_action_save))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun DerivedFieldsDisplay(
    name: String,
    icon: String,
    backgroundColor: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = icon, style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DayPickerField(
    selectedDay: LocalDate?,
    error: String?,
    onDaySelected: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showPicker by remember { mutableStateOf(false) }
    val displayText = selectedDay?.format(
        DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.getDefault()),
    ) ?: ""

    Column(modifier = modifier) {
        Text(
            text = stringResource(R.string.event_form_field_day),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(8.dp),
                )
                .clickable { showPicker = true }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.CalendarToday,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = displayText.ifBlank { stringResource(R.string.event_form_select_date) },
                style = MaterialTheme.typography.bodyLarge,
                color = if (selectedDay != null) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (error != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }
    }

    if (showPicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = selectedDay
                ?.atStartOfDay(ZoneId.of("UTC"))
                ?.toInstant()
                ?.toEpochMilli(),
        )

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val date = Instant.ofEpochMilli(millis)
                                .atZone(ZoneId.of("UTC"))
                                .toLocalDate()
                            onDaySelected(date)
                        }
                        showPicker = false
                    },
                ) {
                    Text(stringResource(R.string.event_form_action_save))
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text(stringResource(R.string.event_form_action_cancel))
                }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerField(
    label: String,
    hours: Int?,
    minutes: Int?,
    error: String?,
    onTimeSelected: (Int, Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(8.dp),
                )
                .clickable { showPicker = true }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.AccessTime,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = if (hours != null && minutes != null) {
                    String.format(Locale.getDefault(), "%02d:%02d", hours, minutes)
                } else {
                    stringResource(R.string.event_form_not_set)
                },
                style = MaterialTheme.typography.bodyLarge,
                color = if (hours != null && minutes != null) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (error != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }
    }

    if (showPicker) {
        val timePickerState = rememberTimePickerState(
            initialHour = hours ?: 0,
            initialMinute = minutes ?: 0,
            is24Hour = true,
        )

        Dialog(onDismissRequest = { showPicker = false }) {
            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = stringResource(R.string.event_form_select_time),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(modifier = Modifier.height(16.dp))
                TimePicker(state = timePickerState)
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    TextButton(onClick = { showPicker = false }) {
                        Text(text = stringResource(R.string.event_form_action_cancel))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    TextButton(
                        onClick = {
                            onTimeSelected(timePickerState.hour, timePickerState.minute)
                            showPicker = false
                        },
                    ) {
                        Text(text = stringResource(R.string.event_form_action_save))
                    }
                }
            }
        }
    }
}

@Composable
private fun NotesField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = { if (it.length <= 200) onValueChange(it) },
            label = { Text(stringResource(R.string.event_form_field_notes)) },
            isError = error != null,
            minLines = 2,
            maxLines = 4,
            supportingText = {
                Text(
                    text = stringResource(R.string.event_form_notes_counter, value.length),
                    style = MaterialTheme.typography.bodySmall,
                )
            },
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            Text(
                text = error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun EventFormScreenPreview() {
    PlanixorTheme {
        EventFormScreen(
            uiState = EventFormUiState(
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
            onEventTypeSelected = { _, _ -> },
            onDaySelected = {},
            onStartTimeSelected = { _, _ -> },
            onEndTimeSelected = { _, _ -> },
            onNotesChanged = {},
            onSave = {},
            onCancel = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun EventFormScreenWithErrorsPreview() {
    PlanixorTheme {
        EventFormScreen(
            uiState = EventFormUiState(
                errors = mapOf(
                    "eventType" to "Selecciona un tipo de evento",
                    "day" to "El día es obligatorio",
                    "startTime" to "La hora de inicio es obligatoria",
                    "endTime" to "La hora de fin es obligatoria",
                ),
                formError = "Solo se permite un turno por día",
            ),
            onEventTypeSelected = { _, _ -> },
            onDaySelected = {},
            onStartTimeSelected = { _, _ -> },
            onEndTimeSelected = { _, _ -> },
            onNotesChanged = {},
            onSave = {},
            onCancel = {},
        )
    }
}
