package com.codenized.planixor.ui.backup

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R

@Composable
fun BackupSection(
    viewModel: BackupViewModel = hiltViewModel(),
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // SAF: Save backup file
    val createDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("*/*"),
    ) { uri ->
        if (uri != null) {
            viewModel.onSaveLocationSelected(uri, context)
        } else {
            viewModel.onSaveCancelled()
        }
    }

    // SAF: Open backup file for restore
    val openDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri != null) {
            viewModel.onFileSelected(uri, context)
        } else {
            viewModel.onRestoreCancelled()
        }
    }

    // Launch the SAF save picker when backup content is ready
    LaunchedEffect(uiState.readyToSave) {
        if (uiState.readyToSave) {
            val filename = viewModel.generateBackupFilename()
            viewModel.onSavePickerLaunched()
            createDocumentLauncher.launch(filename)
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = stringResource(R.string.backup_section_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(
                onClick = { viewModel.prepareBackup() },
                enabled = !uiState.isCreating && !uiState.isRestoring,
                modifier = Modifier.weight(1f),
            ) {
                if (uiState.isCreating) {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .height(16.dp)
                            .width(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(stringResource(R.string.backup_create))
            }

            Spacer(modifier = Modifier.width(12.dp))

            OutlinedButton(
                onClick = {
                    openDocumentLauncher.launch(arrayOf("*/*"))
                },
                enabled = !uiState.isCreating && !uiState.isRestoring,
                modifier = Modifier.weight(1f),
            ) {
                if (uiState.isRestoring) {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .height(16.dp)
                            .width(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(stringResource(R.string.backup_restore))
            }
        }

        // Confirmation dialog for restore when existing data is detected
        if (uiState.showConfirmDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.onCancelRestore() },
                title = { Text(stringResource(R.string.backup_confirm_title)) },
                text = { Text(stringResource(R.string.backup_confirm_message)) },
                confirmButton = {
                    Button(onClick = { viewModel.onConfirmRestore() }) {
                        Text(stringResource(R.string.backup_confirm_continue))
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.onCancelRestore() }) {
                        Text(stringResource(R.string.backup_confirm_cancel))
                    }
                },
            )
        }

        // Error message
        if (uiState.error != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = stringResource(uiState.error!!),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }

        // Success message
        if (uiState.successMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = stringResource(uiState.successMessage!!),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}
