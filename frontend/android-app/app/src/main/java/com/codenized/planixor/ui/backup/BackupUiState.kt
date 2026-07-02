package com.codenized.planixor.ui.backup

data class BackupUiState(
    val isCreating: Boolean = false,
    val isRestoring: Boolean = false,
    val showConfirmDialog: Boolean = false,
    val readyToSave: Boolean = false,
    val error: Int? = null,
    val successMessage: Int? = null,
    val restoredCount: Int = 0,
)
