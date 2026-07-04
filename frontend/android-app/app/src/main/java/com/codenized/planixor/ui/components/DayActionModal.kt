package com.codenized.planixor.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Day Action Modal composable displayed when a user taps a day with existing
 * shift/reminder events in Shift Mode (Month or Year view).
 *
 * Displays:
 * - Date header formatted by locale (Spanish/English patterns)
 * - "Create calendar event" button at top
 * - Shift cards sorted alphabetically by name
 * - Reminder cards sorted alphabetically by name
 *
 * Supports vertical scrolling with fixed header and create button.
 * Rounded corners (12dp), theme-aware (MaterialTheme).
 * Dismissible by back button or tapping outside.
 *
 * Validates: Requirements 6.1, 6.2, 6.11, 8.1, 8.2, 8.11, 9.1, 9.2, 9.5, 9.6, 9.8, 9.9, 9.10
 */
@Composable
fun DayActionModal(
    date: LocalDate,
    shiftEvents: List<CalendarEventDisplay>,
    reminderEvents: List<CalendarEventDisplay>,
    onCreateEvent: () -> Unit,
    onEditShift: (String) -> Unit,
    onEditReminder: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
        ),
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            ) {
                // Fixed header: date + close button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = formatDateByLocale(date),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )

                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = stringResource(R.string.shift_mode_close),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                // Fixed: Create calendar event button
                Button(
                    onClick = onCreateEvent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                ) {
                    Text(text = stringResource(R.string.shift_mode_create_event))
                }

                // Scrollable content: shift cards + reminder cards
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // Shift cards sorted alphabetically by name
                    shiftEvents.forEach { event ->
                        val isOrphaned = event.name == CalendarEventDisplay.UNKNOWN_NAME
                        DayActionShiftCard(
                            event = event,
                            onClick = { if (!isOrphaned) onEditShift(event.id) },
                            enabled = !isOrphaned,
                        )
                    }

                    // Reminder cards sorted alphabetically by name
                    reminderEvents.forEach { event ->
                        val isOrphaned = event.name == CalendarEventDisplay.UNKNOWN_NAME
                        DayActionReminderCard(
                            event = event,
                            onClick = { if (!isOrphaned) onEditReminder(event.id) },
                            enabled = !isOrphaned,
                        )
                    }
                }
            }
        }
    }
}

/**
 * Formats a date according to the current locale.
 * Spanish: "dd de MMMM de yyyy" pattern
 * English: "MMMM dd, yyyy" pattern
 */
private fun formatDateByLocale(date: LocalDate): String {
    val locale = Locale.getDefault()
    val pattern = if (locale.language == "es") {
        "dd 'de' MMMM 'de' yyyy"
    } else {
        "MMMM dd, yyyy"
    }
    val formatter = DateTimeFormatter.ofPattern(pattern, locale)
    return date.format(formatter)
}

@Preview(showBackground = true)
@Composable
private fun DayActionModalPreview() {
    PlanixorTheme {
        DayActionModal(
            date = LocalDate.of(2025, 3, 15),
            shiftEvents = listOf(
                CalendarEventDisplay(
                    id = "1",
                    eventType = "shift",
                    eventTypeId = "s1",
                    startDay = "2025-03-15",
                    endDay = "2025-03-15",
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    notes = null,
                    modifiedAt = System.currentTimeMillis(),
                    syncedAt = null,
                    isDeleted = false,
                    name = "Morning Shift",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                ),
            ),
            reminderEvents = listOf(
                CalendarEventDisplay(
                    id = "2",
                    eventType = "reminder",
                    eventTypeId = "r1",
                    startDay = "2025-03-15",
                    endDay = "2025-03-15",
                    startTime = 540,
                    endTime = 600,
                    totalHours = 60,
                    notes = null,
                    modifiedAt = System.currentTimeMillis(),
                    syncedAt = null,
                    isDeleted = false,
                    name = "Take Medicine",
                    icon = "💊",
                    backgroundColor = "#2563EB",
                ),
            ),
            onCreateEvent = {},
            onEditShift = {},
            onEditReminder = {},
            onDismiss = {},
        )
    }
}
