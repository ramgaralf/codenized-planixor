package com.codenized.planixor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.core.graphics.toColorInt
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.util.Locale

/**
 * Compact reminder card for the Day Action Modal.
 * Displays reminder name (max 50 chars, ellipsis), emoji icon, and time range.
 * 4dp left border with reminder's color.
 * Clickable — triggers edit handler.
 *
 * Validates: Requirements 9.4
 */
@Composable
fun DayActionReminderCard(
    event: CalendarEventDisplay,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val alpha = if (enabled) 1f else 0.5f
    Card(
        modifier = modifier
            .fillMaxWidth()
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = alpha),
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
        ) {
            // 4dp left border with reminder's color
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(
                        color = parseReminderHexColorSafe(event.backgroundColor),
                        shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp),
                    ),
            )

            // Emoji icon, vertically centered spanning full card height
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .padding(start = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = event.icon,
                    style = MaterialTheme.typography.titleMedium,
                )
            }

            // Content: name + time range
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(start = 8.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${formatReminderTime(event.startTime)} – ${formatReminderTime(event.endTime)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun formatReminderTime(minutesFromMidnight: Int): String {
    val hours = minutesFromMidnight / 60
    val minutes = minutesFromMidnight % 60
    return String.format(Locale.getDefault(), "%02d:%02d", hours, minutes)
}

private fun parseReminderHexColorSafe(hex: String): Color {
    return try {
        Color(hex.toColorInt())
    } catch (e: IllegalArgumentException) {
        Color.Gray
    }
}

@Preview(showBackground = true)
@Composable
private fun DayActionReminderCardPreview() {
    PlanixorTheme {
        DayActionReminderCard(
            event = CalendarEventDisplay(
                id = "1",
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
                name = "Take Medicine with a very long name that exceeds fifty characters limit",
                icon = "💊",
                backgroundColor = "#2563EB",
            ),
            onClick = {},
        )
    }
}
