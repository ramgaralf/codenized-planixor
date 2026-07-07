package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.util.Locale

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
    val startTime: Int? = null,
    val endTime: Int? = null,
    val seriesFrequency: String = "never",
)

/**
 * Parses a hex color string (e.g., "#10B981") to a Compose Color.
 */
private fun parseHexColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: Exception) {
        Color.Gray
    }
}

/**
 * Formats minutes since midnight to "HH:mm".
 */
private fun formatTimeFromMinutes(totalMinutes: Int): String {
    val h = totalMinutes / 60
    val m = totalMinutes % 60
    return String.format(Locale.getDefault(), "%02d:%02d", h, m)
}

/**
 * Dropdown selector for choosing an event type (shift or reminder).
 * Shows rich options with colored indicator, icon, name, and time range for shifts.
 * Sorted: shifts first (alphabetically), then reminders (alphabetically).
 *
 * @param options Available event type options (already filtered and sorted).
 * @param selectedId Currently selected eventTypeId, or null.
 * @param error Validation error message key, or null.
 * @param onSelected Callback with eventType and eventTypeId when user picks an option.
 * @param modifier Optional modifier.
 */
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

    Column(modifier = modifier) {
        Text(
            text = stringResource(R.string.event_form_field_event_type),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))

        Box {
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
                    .clickable { expanded = true }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (selectedOption != null) {
                    EventTypeOptionContent(option = selectedOption)
                } else {
                    Text(
                        text = stringResource(R.string.event_form_select_type),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .heightIn(max = 280.dp),
            ) {
                options.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onSelected(option.eventType, option.id)
                                expanded = false
                            }
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        EventTypeOptionContent(option = option)
                    }
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

/**
 * Renders a single event type option row: colored box with icon + name + time range.
 */
@Composable
private fun EventTypeOptionContent(
    option: EventTypeOption,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(parseHexColor(option.backgroundColor)),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = option.icon, style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = option.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (option.eventType == "shift" && option.startTime != null && option.endTime != null) {
                Text(
                    text = "${formatTimeFromMinutes(option.startTime)} – ${formatTimeFromMinutes(option.endTime)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (option.eventType == "reminder" && option.seriesFrequency != "never" && option.seriesFrequency.isNotEmpty()) {
                Text(
                    text = when (option.seriesFrequency) {
                        "weekly" -> stringResource(R.string.reminder_series_weekly)
                        "monthly" -> stringResource(R.string.reminder_series_monthly)
                        "yearly" -> stringResource(R.string.reminder_series_yearly)
                        else -> ""
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
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
                    startTime = 480,
                    endTime = 960,
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
