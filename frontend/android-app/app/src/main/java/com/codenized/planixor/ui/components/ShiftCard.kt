package com.codenized.planixor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.Shift
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.util.Locale

@Composable
fun ShiftCard(
    shift: Shift,
    onEditClick: (String) -> Unit,
    onToggleActiveClick: (String) -> Unit,
    onDeleteClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val contentAlpha = if (shift.isActive) 1f else 0.5f

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp),
        ) {
            // Left color indicator strip (8dp wide)
            Box(
                modifier = Modifier
                    .width(8.dp)
                    .fillMaxHeight()
                    .background(
                        color = parseHexColor(shift.backgroundColor),
                        shape = RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp),
                    ),
            )

            // Card content
            Row(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
                    .alpha(contentAlpha),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Shift info
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.Center,
                ) {
                    // First row: icon + name + deactivated badge
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = shift.icon,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = shift.name,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        if (!shift.isActive) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = stringResource(R.string.shift_card_deactivated),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Second row: start time + end time + hours worked
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = formatMinutesFromMidnight(shift.startTime),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = " – ",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = formatMinutesFromMidnight(shift.endTime),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = formatHoursWorked(shift.hoursWorked),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                // Action buttons (44x44dp touch targets, 8dp gap, 20dp icons)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    IconButton(
                        onClick = { onEditClick(shift.id) },
                        modifier = Modifier.size(44.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Edit,
                            contentDescription = stringResource(R.string.shift_card_edit),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    IconButton(
                        onClick = { onToggleActiveClick(shift.id) },
                        modifier = Modifier.size(44.dp),
                    ) {
                        Icon(
                            imageVector = if (shift.isActive) {
                                Icons.Outlined.Pause
                            } else {
                                Icons.Outlined.PlayArrow
                            },
                            contentDescription = stringResource(R.string.shift_card_toggle_active),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    IconButton(
                        onClick = { onDeleteClick(shift.id) },
                        modifier = Modifier.size(44.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Delete,
                            contentDescription = stringResource(R.string.shift_card_delete),
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
        }
    }
}

private fun parseHexColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: IllegalArgumentException) {
        Color.Gray
    }
}

private fun formatMinutesFromMidnight(totalMinutes: Int): String {
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return String.format(Locale.getDefault(), "%02d:%02d", hours, minutes)
}

private fun formatHoursWorked(totalMinutes: Int): String {
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return "${hours}h ${minutes}m"
}

@Preview(showBackground = true)
@Composable
private fun ShiftCardActivePreview() {
    PlanixorTheme {
        ShiftCard(
            shift = Shift(
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
            onEditClick = {},
            onToggleActiveClick = {},
            onDeleteClick = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftCardDeactivatedPreview() {
    PlanixorTheme {
        ShiftCard(
            shift = Shift(
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
            onEditClick = {},
            onToggleActiveClick = {},
            onDeleteClick = {},
        )
    }
}
