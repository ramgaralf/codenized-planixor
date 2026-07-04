package com.codenized.planixor.ui.settings

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.BuildConfig
import com.codenized.planixor.LocalThemeViewModel
import com.codenized.planixor.R
import com.codenized.planixor.data.notification.NotificationChannel
import com.codenized.planixor.model.ThemeMode
import com.codenized.planixor.ui.backup.BackupSection
import com.codenized.planixor.ui.backup.BackupViewModel
import com.codenized.planixor.ui.theme.Poppins

@Composable
fun SettingsScreen(
    settingsViewModel: SettingsViewModel = hiltViewModel(),
) {
    val themeViewModel = LocalThemeViewModel.current
    val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()
    val selectedLocale by settingsViewModel.locale.collectAsStateWithLifecycle()
    val shiftModeEnabled by settingsViewModel.shiftModeEnabled.collectAsStateWithLifecycle()
    val notificationChannel by settingsViewModel.notificationChannel.collectAsStateWithLifecycle()
    val showPermissionWarning by settingsViewModel.showPermissionWarning.collectAsStateWithLifecycle()
    val pendingChannelSelection by settingsViewModel.pendingChannelSelection.collectAsStateWithLifecycle()

    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        settingsViewModel.onPermissionResult(granted)
    }

    // When a pending selection is set, trigger the permission request
    LaunchedEffect(pendingChannelSelection) {
        val pending = pendingChannelSelection
        if (pending != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                // Below API 33, check if notifications are enabled at system level
                val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
                settingsViewModel.onPermissionResult(enabled)
            }
        }
    }

    // Check permission state on composition to update warning visibility
    LaunchedEffect(Unit) {
        val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        }
        settingsViewModel.updatePermissionWarning(hasPermission)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        // User Manual section
        Text(
            text = stringResource(R.string.settings_user_manual_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = stringResource(R.string.settings_user_manual_description),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://planixor.codenized.com/help"))
                context.startActivity(intent)
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.settings_user_manual_button))
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Shift Mode section
        Text(
            text = stringResource(R.string.shift_mode_toggle_label),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = stringResource(R.string.shift_mode_toggle_description),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.shift_mode_toggle_label),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Switch(
                checked = shiftModeEnabled,
                onCheckedChange = { settingsViewModel.toggleShiftMode() },
                colors = SwitchDefaults.colors(
                    checkedTrackColor = MaterialTheme.colorScheme.primary,
                ),
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Theme section
        Text(
            text = stringResource(R.string.settings_theme_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        ThemeOptions(
            selectedTheme = themeMode,
            onThemeSelected = { themeViewModel.setTheme(it) },
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Language section
        Text(
            text = stringResource(R.string.settings_language_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        LanguageOptions(
            selectedLocale = selectedLocale,
            onLocaleSelected = { settingsViewModel.setLocale(it) },
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Notifications section
        Text(
            text = stringResource(R.string.settings_notifications_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        NotificationChannelOptions(
            selectedChannel = notificationChannel,
            onChannelSelected = { channel ->
                val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                } else {
                    NotificationManagerCompat.from(context).areNotificationsEnabled()
                }
                settingsViewModel.onNotificationChannelSelected(channel, hasPermission)
            },
        )

        // Inline warning when system notifications are blocked
        if (showPermissionWarning) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.settings_notifications_permission_warning),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Backup section
        BackupSection()

        Spacer(modifier = Modifier.height(32.dp))

        // Danger zone section
        Text(
            text = stringResource(R.string.settings_danger_zone_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = stringResource(R.string.settings_reset_description),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(12.dp))

        var showResetDialog by remember { mutableStateOf(false) }

        OutlinedButton(
            onClick = { showResetDialog = true },
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error,
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.settings_reset_button))
        }

        if (showResetDialog) {
            AlertDialog(
                onDismissRequest = { showResetDialog = false },
                title = { Text(stringResource(R.string.settings_reset_button)) },
                text = { Text(stringResource(R.string.settings_reset_confirmation)) },
                confirmButton = {
                    Button(
                        onClick = {
                            showResetDialog = false
                            settingsViewModel.resetApplication()
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                        ),
                    ) {
                        Text(stringResource(R.string.common_confirm))
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showResetDialog = false }) {
                        Text(stringResource(R.string.common_cancel))
                    }
                },
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Version display
        Text(
            text = "v${BuildConfig.VERSION_NAME}",
            style = MaterialTheme.typography.bodyMedium.copy(
                fontFamily = Poppins,
                fontWeight = FontWeight.Medium,
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ThemeOptions(
    selectedTheme: ThemeMode,
    onThemeSelected: (ThemeMode) -> Unit,
) {
    Column(modifier = Modifier.selectableGroup()) {
        SettingsRadioOption(
            label = stringResource(R.string.settings_theme_light),
            selected = selectedTheme == ThemeMode.Light,
            onClick = { onThemeSelected(ThemeMode.Light) },
        )
        SettingsRadioOption(
            label = stringResource(R.string.settings_theme_dark),
            selected = selectedTheme == ThemeMode.Dark,
            onClick = { onThemeSelected(ThemeMode.Dark) },
        )
        SettingsRadioOption(
            label = stringResource(R.string.settings_theme_system),
            selected = selectedTheme == ThemeMode.System,
            onClick = { onThemeSelected(ThemeMode.System) },
        )
    }
}

@Composable
private fun LanguageOptions(
    selectedLocale: String,
    onLocaleSelected: (String) -> Unit,
) {
    Column(modifier = Modifier.selectableGroup()) {
        SettingsRadioOption(
            label = stringResource(R.string.settings_language_spanish),
            selected = selectedLocale == "es",
            onClick = { onLocaleSelected("es") },
        )
        SettingsRadioOption(
            label = stringResource(R.string.settings_language_english),
            selected = selectedLocale == "en",
            onClick = { onLocaleSelected("en") },
        )
    }
}

@Composable
private fun NotificationChannelOptions(
    selectedChannel: NotificationChannel,
    onChannelSelected: (NotificationChannel) -> Unit,
) {
    Column(modifier = Modifier.selectableGroup()) {
        SettingsRadioOption(
            label = stringResource(R.string.settings_notifications_channel_app),
            selected = selectedChannel == NotificationChannel.APP,
            onClick = { onChannelSelected(NotificationChannel.APP) },
        )
        SettingsRadioOption(
            label = stringResource(R.string.settings_notifications_channel_system),
            selected = selectedChannel == NotificationChannel.SYSTEM,
            onClick = { onChannelSelected(NotificationChannel.SYSTEM) },
        )
        SettingsRadioOption(
            label = stringResource(R.string.settings_notifications_channel_both),
            selected = selectedChannel == NotificationChannel.BOTH,
            onClick = { onChannelSelected(NotificationChannel.BOTH) },
        )
    }
}

@Composable
private fun SettingsRadioOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .selectable(
                selected = selected,
                onClick = onClick,
                role = Role.RadioButton,
            )
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(
            selected = selected,
            onClick = null,
            colors = RadioButtonDefaults.colors(
                selectedColor = MaterialTheme.colorScheme.primary,
            ),
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}


@Composable
private fun BackupSection(
    backupViewModel: BackupViewModel = hiltViewModel(),
) {
    val uiState by backupViewModel.uiState.collectAsStateWithLifecycle()
    val isOperating = uiState.isCreating || uiState.isRestoring

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = stringResource(R.string.backup_section_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(modifier = Modifier.fillMaxWidth()) {
            FilledTonalButton(
                onClick = { backupViewModel.prepareBackup() },
                enabled = !isOperating,
                modifier = Modifier.weight(1f),
            ) {
                if (uiState.isCreating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(stringResource(R.string.backup_create))
            }

            Spacer(modifier = Modifier.width(12.dp))

            OutlinedButton(
                onClick = { /* SAF open picker handled in task 12.3 */ },
                enabled = !isOperating,
                modifier = Modifier.weight(1f),
            ) {
                if (uiState.isRestoring) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(stringResource(R.string.backup_restore))
            }
        }
    }

    // Confirmation dialog for restore
    if (uiState.showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { backupViewModel.onCancelRestore() },
            title = { Text(stringResource(R.string.backup_confirm_title)) },
            text = { Text(stringResource(R.string.backup_confirm_message)) },
            confirmButton = {
                Button(onClick = { backupViewModel.onConfirmRestore() }) {
                    Text(stringResource(R.string.backup_confirm_continue))
                }
            },
            dismissButton = {
                TextButton(onClick = { backupViewModel.onCancelRestore() }) {
                    Text(stringResource(R.string.backup_confirm_cancel))
                }
            },
        )
    }

    // Show success/error messages as inline text (Snackbar integration in task 12.3)
    uiState.successMessage?.let { msgRes ->
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = if (msgRes == R.string.backup_restore_success) {
                stringResource(msgRes, uiState.restoredCount)
            } else {
                stringResource(msgRes)
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
    }

    uiState.error?.let { errorRes ->
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(errorRes),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
    }
}
