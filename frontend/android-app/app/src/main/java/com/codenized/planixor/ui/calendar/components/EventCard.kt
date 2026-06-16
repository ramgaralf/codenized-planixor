package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Card composable representing a calendar event.
 * Displays icon, name, time range with duration, and notes.
 * Uses the event's background color as the card background.
 *
 * @param event The calendar event display model with derived fields.
 * @param onClick Callback when the card is tapped.
 * @param showNotes Whether to show the notes line (Day view shows notes, Week view does not).
 * @param modifier Optional modifier.
 */
@Composable
fun EventCard(
    event: CalendarEventDisplay,
    onClick: () -> Unit,
    showNotes: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val bgColor = parseHexColorSafe(event.backgroundColor)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor.copy(alpha = 0.15f))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 6.dp),
    ) {
        // Line 1: icon + name
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = event.icon,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = event.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        // Line 2: start time – end time · duration
        val startFormatted = formatMinutesToTime(event.startTime)
        val endFormatted = formatMinutesToTime(event.endTime)
        val duration = formatDuration(event.startTime, event.endTime)

        Text(
            text = "$startFormatted – $endFormatted · $duration",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // Line 3: notes (only in Day view)
        if (showNotes && !event.notes.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = event.notes,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Formats minutes from midnight to HH:mm string.
 */
internal fun formatMinutesToTime(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    return String.format(java.util.Locale.getDefault(), "%02d:%02d", h, m)
}

/**
 * Formats the duration between start and end time as "Xh Ym".
 */
internal fun formatDuration(startTime: Int, endTime: Int): String {
    val diff = endTime - startTime
    if (diff <= 0) return "0m"
    val hours = diff / 60
    val mins = diff % 60
    return when {
        hours > 0 && mins > 0 -> "${hours}h ${mins}m"
        hours > 0 -> "${hours}h"
        else -> "${mins}m"
    }
}

/**
 * Safely parses a hex color string, returning a default if parsing fails.
 */
internal fun parseHexColorSafe(hex: String): Color {
    return try {
        if (hex.isBlank() || hex == "transparent") {
            Color.Gray
        } else {
            Color(android.graphics.Color.parseColor(hex))
        }
    } catch (_: IllegalArgumentException) {
        Color.Gray
    }
}

@Preview(showBackground = true)
@Composable
private fun EventCardPreview() {
    PlanixorTheme {
        EventCard(
            event = CalendarEventDisplay(
                id = "1",
                eventType = "shift",
                eventTypeId = "s1",
                day = "2024-06-15",
                startTime = 480,
                endTime = 960,
                notes = "Morning shift with team lead",
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
                name = "Mañana",
                icon = "☀️",
                backgroundColor = "#10B981",
            ),
            onClick = {},
        )
    }
}
