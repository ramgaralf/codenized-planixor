package com.codenized.planixor.ui.backup

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.R
import com.codenized.planixor.domain.backup.BackupRestoreService
import com.codenized.planixor.domain.backup.BackupSerializer
import com.codenized.planixor.domain.backup.BackupValidator
import com.codenized.planixor.domain.backup.BackupFile
import com.codenized.planixor.domain.backup.MAX_BACKUP_SIZE_BYTES
import com.codenized.planixor.domain.backup.ValidationException
import com.codenized.planixor.domain.backup.ValidationError
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class BackupViewModel @Inject constructor(
    private val backupSerializer: BackupSerializer,
    private val backupValidator: BackupValidator,
    private val backupRestoreService: BackupRestoreService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BackupUiState())
    val uiState: StateFlow<BackupUiState> = _uiState.asStateFlow()

    private var pendingBackupContent: String? = null
    private var pendingBackupFile: BackupFile? = null

    /**
     * Generates the backup filename using local device time.
     * Format: planixor-yyyyMMdd-HHmmss.bak
     */
    fun generateBackupFilename(): String {
        val now = LocalDateTime.now()
        val formatter = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
        return "planixor-${now.format(formatter)}.bak"
    }

    /**
     * Step 1 of create: Serializes all data and checks size.
     * Called before triggering the SAF save picker.
     * Returns true if serialization succeeded (content stored in pendingBackupContent).
     */
    fun prepareBackup() {
        if (_uiState.value.isCreating || _uiState.value.isRestoring) return

        viewModelScope.launch {
            _uiState.update { it.copy(isCreating = true, error = null, successMessage = null) }

            try {
                val content = backupSerializer.serialize()
                val sizeBytes = content.toByteArray(Charsets.UTF_8).size.toLong()

                if (sizeBytes > MAX_BACKUP_SIZE_BYTES) {
                    _uiState.update {
                        it.copy(isCreating = false, error = R.string.backup_file_too_large)
                    }
                    return@launch
                }

                pendingBackupContent = content
                _uiState.update { it.copy(readyToSave = true) }
            } catch (_: Exception) {
                pendingBackupContent = null
                _uiState.update {
                    it.copy(isCreating = false, error = R.string.backup_create_failed)
                }
            }
        }
    }

    /**
     * Called after the SAF save picker has been launched.
     * Resets the readyToSave flag to prevent re-triggering.
     */
    fun onSavePickerLaunched() {
        _uiState.update { it.copy(readyToSave = false) }
    }

    /**
     * Whether a backup has been prepared and is ready to be saved.
     */
    fun hasPendingBackup(): Boolean = pendingBackupContent != null

    /**
     * Step 2 of create: Writes the pending content to the selected URI.
     * Called after SAF save picker returns a URI.
     */
    fun onSaveLocationSelected(uri: Uri, context: Context) {
        val content = pendingBackupContent
        if (content == null) {
            _uiState.update {
                it.copy(isCreating = false, error = R.string.backup_create_failed)
            }
            return
        }

        viewModelScope.launch {
            try {
                context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                    outputStream.write(content.toByteArray(Charsets.UTF_8))
                } ?: run {
                    _uiState.update {
                        it.copy(isCreating = false, error = R.string.backup_save_failed)
                    }
                    return@launch
                }

                pendingBackupContent = null
                _uiState.update {
                    it.copy(
                        isCreating = false,
                        successMessage = R.string.backup_create_success,
                    )
                }
            } catch (_: Exception) {
                pendingBackupContent = null
                _uiState.update {
                    it.copy(isCreating = false, error = R.string.backup_save_failed)
                }
            }
        }
    }

    /**
     * Called when the user cancels the save file picker.
     */
    fun onSaveCancelled() {
        pendingBackupContent = null
        _uiState.update {
            it.copy(isCreating = false, error = R.string.backup_create_cancelled)
        }
    }

    /**
     * Step 1 of restore: Reads and validates the file from the selected URI.
     * Called after SAF open picker returns a URI.
     */
    fun onFileSelected(uri: Uri, context: Context) {
        if (_uiState.value.isCreating || _uiState.value.isRestoring) return

        viewModelScope.launch {
            _uiState.update { it.copy(isRestoring = true, error = null, successMessage = null) }

            try {
                val content = context.contentResolver.openInputStream(uri)?.use { inputStream ->
                    inputStream.bufferedReader(Charsets.UTF_8).readText()
                }

                if (content == null) {
                    _uiState.update {
                        it.copy(isRestoring = false, error = R.string.backup_restore_failed)
                    }
                    return@launch
                }

                val fileSize = content.toByteArray(Charsets.UTF_8).size.toLong()
                val validationResult = backupValidator.validate(content, fileSize)

                validationResult.fold(
                    onSuccess = { backupFile ->
                        pendingBackupFile = backupFile
                        checkExistingDataAndProceed()
                    },
                    onFailure = { throwable ->
                        val errorRes = mapValidationError(throwable)
                        _uiState.update {
                            it.copy(isRestoring = false, error = errorRes)
                        }
                    },
                )
            } catch (_: Exception) {
                _uiState.update {
                    it.copy(isRestoring = false, error = R.string.backup_restore_failed)
                }
            }
        }
    }

    /**
     * Called when the user cancels the open file picker.
     */
    fun onRestoreCancelled() {
        _uiState.update {
            it.copy(isRestoring = false, error = R.string.backup_restore_cancelled)
        }
    }

    /**
     * Called when the user confirms the restore from the confirmation dialog.
     */
    fun onConfirmRestore() {
        _uiState.update { it.copy(showConfirmDialog = false) }
        performRestore()
    }

    /**
     * Called when the user cancels the restore from the confirmation dialog.
     */
    fun onCancelRestore() {
        pendingBackupFile = null
        _uiState.update {
            it.copy(showConfirmDialog = false, isRestoring = false)
        }
    }

    fun dismissMessage() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }

    private suspend fun checkExistingDataAndProceed() {
        try {
            val hasExisting = backupRestoreService.checkExistingData()
            if (hasExisting) {
                _uiState.update { it.copy(showConfirmDialog = true) }
            } else {
                performRestore()
            }
        } catch (_: Exception) {
            pendingBackupFile = null
            _uiState.update {
                it.copy(isRestoring = false, error = R.string.backup_verification_failed)
            }
        }
    }

    private fun performRestore() {
        val backupFile = pendingBackupFile
        if (backupFile == null) {
            _uiState.update {
                it.copy(isRestoring = false, error = R.string.backup_restore_failed)
            }
            return
        }

        viewModelScope.launch {
            try {
                val hasExisting = backupRestoreService.checkExistingData()
                val result = backupRestoreService.restore(backupFile, hasExisting)
                pendingBackupFile = null

                if (result.success) {
                    _uiState.update {
                        it.copy(
                            isRestoring = false,
                            successMessage = R.string.backup_restore_success,
                            restoredCount = result.restoredCount,
                        )
                    }
                } else if (result.succeededEntities.isNotEmpty()) {
                    _uiState.update {
                        it.copy(
                            isRestoring = false,
                            successMessage = R.string.backup_restore_partial,
                            restoredCount = result.restoredCount,
                            succeededEntities = result.succeededEntities.joinToString(", "),
                            failedEntities = result.failedEntities.joinToString(", "),
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isRestoring = false,
                            error = R.string.backup_restore_failed,
                        )
                    }
                }
            } catch (_: Exception) {
                pendingBackupFile = null
                _uiState.update {
                    it.copy(isRestoring = false, error = R.string.backup_restore_failed)
                }
            }
        }
    }

    private fun mapValidationError(throwable: Throwable): Int {
        if (throwable is ValidationException) {
            return when (throwable.error) {
                is ValidationError.FileTooLarge -> R.string.backup_file_too_large
                is ValidationError.InvalidJson -> R.string.backup_invalid_json
                is ValidationError.InvalidSchema -> R.string.backup_invalid_schema
                is ValidationError.IncompatibleVersion -> R.string.backup_incompatible_version
            }
        }
        return R.string.backup_restore_failed
    }
}
