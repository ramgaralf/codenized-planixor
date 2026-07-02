package com.codenized.planixor.ui.notifications

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DoneAll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/**
 * Full-screen notification list for Android.
 * Displays unread delivered notifications with event icon, name, alert label, and time.
 * Tap on an item marks it as read.
 */
@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    NotificationsContent(
        uiState = uiState,
        onItemClick = { id -> viewModel.markAsRead(id) },
        onMarkAllAsRead = { viewModel.markAllAsRead() },
    )
}

@Composable
private fun NotificationsContent(
    uiState: NotificationsUiState,
    onItemClick: (String) -> Unit,
    onMarkAllAsRead: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Mark all as read action row
        if (uiState.notifications.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                IconButton(onClick = onMarkAllAsRead) {
                    Icon(
                        imageVector = Icons.Outlined.DoneAll,
                        contentDescription = stringResource(R.string.notifications_mark_all_read),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }

        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.notifications.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = stringResource(R.string.notifications_empty),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            else -> {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(
                        items = uiState.notifications,
                        key = { it.id },
                    ) { item ->
                        NotificationListItem(
                            item = item,
                            onClick = { onItemClick(item.id) },
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationListItem(
    item: NotificationItem,
    onClick: () -> Unit,
) {
    val truncatedName = if (item.eventName.length > 60) {
        item.eventName.take(60) + "…"
    } else {
        item.eventName
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !item.isEventDeleted, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Event icon (emoji)
        Text(
            text = item.eventIcon,
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.size(40.dp),
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = truncatedName,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = stringResource(item.alertLabel),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        Text(
            text = formatTriggerTime(item.triggerTime),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/**
 * Formats trigger time:
 * - < 24h ago → relative ("5 min ago" / "hace 5 min")
 * - >= 24h → absolute date in device locale format
 */
@Composable
private fun formatTriggerTime(triggerTimeMillis: Long): String {
    val now = Instant.now()
    val triggerInstant = Instant.ofEpochMilli(triggerTimeMillis)
    val duration = Duration.between(triggerInstant, now)

    return if (duration.toHours() < 24 && !duration.isNegative) {
        val minutes = duration.toMinutes()
        when {
            minutes < 1 -> stringResource(R.string.notifications_time_just_now)
            minutes < 60 -> stringResource(R.string.notifications_time_minutes_ago, minutes)
            else -> {
                val hours = duration.toHours()
                stringResource(R.string.notifications_time_hours_ago, hours)
            }
        }
    } else {
        val localDateTime = triggerInstant.atZone(ZoneId.systemDefault()).toLocalDateTime()
        val formatter = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT)
        localDateTime.format(formatter)
    }
}
