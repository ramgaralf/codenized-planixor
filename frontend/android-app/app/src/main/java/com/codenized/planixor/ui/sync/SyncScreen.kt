package com.codenized.planixor.ui.sync

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.data.sync.ConnectionStatus
import java.text.DateFormat
import java.util.Date

/**
 * Sync management screen displaying connection status, configuration details,
 * and pause/resume controls.
 *
 * @param viewModel Shared SyncViewModel exposing sync UI state
 * @param onNavigateToConfig Callback to navigate to the sync configuration screen
 */
@Composable
fun SyncScreen(
    viewModel: SyncViewModel,
    onNavigateToConfig: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    SyncContent(
        uiState = uiState,
        onPause = viewModel::pause,
        onResume = viewModel::resume,
        onNavigateToConfig = onNavigateToConfig,
    )
}

@Composable
internal fun SyncContent(
    uiState: SyncUiState,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onNavigateToConfig: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Status row
        StatusRow(connectionStatus = uiState.connectionStatus)

        Spacer(modifier = Modifier.height(8.dp))

        // Info fields
        InfoField(
            label = stringResource(R.string.sync_server_url),
            value = if (uiState.config != null) {
                "${uiState.config!!.serverUrl}${uiState.config!!.apiBasePath}"
            } else {
                ""
            },
        )

        InfoField(
            label = stringResource(R.string.sync_api_key),
            value = maskApiKey(uiState.config?.apiKey ?: ""),
        )

        InfoField(
            label = stringResource(R.string.sync_username),
            value = uiState.config?.username ?: "",
        )

        InfoField(
            label = stringResource(R.string.sync_last_synced),
            value = formatLastSynced(uiState.lastSyncedAt),
        )

        InfoField(
            label = stringResource(R.string.sync_interval_display),
            value = stringResource(R.string.sync_config_sync_interval_unit, uiState.config?.syncIntervalMinutes ?: 5),
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Pause button: visible when ACTIVE or FAILING
        if (uiState.connectionStatus == ConnectionStatus.ACTIVE ||
            uiState.connectionStatus == ConnectionStatus.FAILING
        ) {
            Button(
                onClick = onPause,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.sync_action_pause))
            }
        }

        // Resume button: visible when PAUSED
        if (uiState.connectionStatus == ConnectionStatus.PAUSED) {
            Button(
                onClick = onResume,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.sync_action_resume))
            }
        }

        // Configuration button: always visible
        OutlinedButton(
            onClick = onNavigateToConfig,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.sync_action_configuration))
        }
    }
}

@Composable
private fun StatusRow(connectionStatus: ConnectionStatus) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(statusDotColor(connectionStatus)),
        )
        Text(
            text = statusText(connectionStatus),
            style = MaterialTheme.typography.titleMedium,
        )
    }
}

@Composable
private fun InfoField(
    label: String,
    value: String,
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}

@Composable
private fun statusDotColor(status: ConnectionStatus): Color {
    return when (status) {
        ConnectionStatus.ACTIVE -> Color(0xFF10B981)
        ConnectionStatus.FAILING -> MaterialTheme.colorScheme.error
        ConnectionStatus.PAUSED -> MaterialTheme.colorScheme.onSurfaceVariant
        ConnectionStatus.UNCONFIGURED -> MaterialTheme.colorScheme.onSurfaceVariant
    }
}

@Composable
private fun statusText(status: ConnectionStatus): String {
    return when (status) {
        ConnectionStatus.UNCONFIGURED -> stringResource(R.string.sync_status_unconfigured)
        ConnectionStatus.ACTIVE -> stringResource(R.string.sync_status_active)
        ConnectionStatus.FAILING -> stringResource(R.string.sync_status_failing)
        ConnectionStatus.PAUSED -> stringResource(R.string.sync_status_paused)
    }
}

@Composable
private fun formatLastSynced(timestamp: Long?): String {
    if (timestamp == null) return stringResource(R.string.sync_never)
    val dateFormat = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
    return dateFormat.format(Date(timestamp))
}

internal fun maskApiKey(key: String): String {
    if (key.length <= 7) return "\u2022\u2022\u2022\u2022\u2022\u2022"
    return key.take(3) + "\u2022\u2022\u2022\u2022\u2022\u2022" + key.takeLast(4)
}
