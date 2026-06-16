package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Represents a selectable event type option (shift or reminder).
 */
data class EventTypeOption(
    val id: String,
    val eventType: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val displayLabel: String,
)

/**
 * Dropdown selector for choosing an event type (shift or reminder).
 * Shows options formatted as "{type}: {name}" ordered alphabetically.
 * Only active, non-deleted items are shown.
 *
 * @param options Available event type options (already filtered and sorted).
 * @param selectedId Currently selected eventTypeId, or null.
 * @param error Validation error message key, or null.
 * @param onSelected Callback with eventType and eventTypeId when user picks an option.
 * @param modifier Optional modifier.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventTypeSelector(
    options: List<EventTypeOption>,
    selectedId: String?,
    error: String?,
    onSelected: (eventType: String, eventTypeId: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedOption = options.find { it.id == selectedId }
    val displayText = selectedOption?.displayLabel ?: ""

    Column(modifier = modifier) {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = it },
        ) {
            OutlinedTextField(
                value = displayText,
                onValueChange = {},
                readOnly = true,
                label = { Text(stringResource(R.string.event_form_field_event_type)) },
                placeholder = { Text(stringResource(R.string.event_form_select_type)) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                isError = error != null,
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable),
            )

            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = {
                            Text(text = "${option.icon} ${option.displayLabel}")
                        },
                        onClick = {
                            onSelected(option.eventType, option.id)
                            expanded = false
                        },
                    )
                }
            }
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
}

@Preview(showBackground = true)
@Composable
private fun EventTypeSelectorPreview() {
    PlanixorTheme {
        EventTypeSelector(
            options = listOf(
                EventTypeOption(
                    id = "1",
                    eventType = "shift",
                    name = "Mañana",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                    displayLabel = "Turno: Mañana",
                ),
                EventTypeOption(
                    id = "2",
                    eventType = "reminder",
                    name = "Tomar medicina",
                    icon = "💊",
                    backgroundColor = "#2563EB",
                    displayLabel = "Recordatorio: Tomar medicina",
                ),
            ),
            selectedId = null,
            error = null,
            onSelected = { _, _ -> },
        )
    }
}
