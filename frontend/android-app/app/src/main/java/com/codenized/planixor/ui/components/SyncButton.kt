package com.codenized.planixor.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.PauseCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import com.codenized.planixor.R
import com.codenized.planixor.data.sync.ConnectionStatus

/**
 * Sync status indicator button for the top app bar.
 * Displays an icon and tint color based on the current [ConnectionStatus].
 * Replaces the user avatar icon in the TopBar.
 */
@Composable
fun SyncButton(
    connectionStatus: ConnectionStatus,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val (icon, tint) = syncIconAndTint(connectionStatus)

    IconButton(
        onClick = onClick,
        modifier = modifier,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = stringResource(R.string.content_description_sync_status),
            tint = tint,
        )
    }
}

/**
 * Maps [ConnectionStatus] to the corresponding Material icon and tint color.
 */
@Composable
private fun syncIconAndTint(status: ConnectionStatus): Pair<ImageVector, Color> {
    return when (status) {
        ConnectionStatus.UNCONFIGURED -> Icons.Outlined.CloudOff to MaterialTheme.colorScheme.onSurfaceVariant
        ConnectionStatus.ACTIVE -> Icons.Outlined.Cloud to Color(0xFF10B981)
        ConnectionStatus.FAILING -> Icons.Outlined.CloudOff to MaterialTheme.colorScheme.error
        ConnectionStatus.PAUSED -> Icons.Outlined.PauseCircle to MaterialTheme.colorScheme.onSurfaceVariant
    }
}
