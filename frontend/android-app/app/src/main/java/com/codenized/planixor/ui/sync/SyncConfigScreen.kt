package com.codenized.planixor.ui.sync

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.data.sync.ApiBasePathUtils
import com.codenized.planixor.data.sync.UrlValidationError
import com.codenized.planixor.data.sync.UrlValidationException

/**
 * Valid selectable sync interval values in minutes.
 */
private val SYNC_INTERVAL_OPTIONS = listOf(5, 10, 15, 20, 25, 30, 45, 60)

/**
 * Sync configuration screen allowing the user to enter a server URL and API key,
 * validate the connection, and persist the config on success.
 *
 * @param viewModel Shared SyncViewModel (scoped to activity/nav graph)
 * @param onNavigateBack Callback to navigate back (cancel action)
 * @param onNavigateToSync Callback to navigate to the Sync screen on success
 */
@Composable
fun SyncConfigScreen(
    viewModel: SyncViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToSync: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var serverUrl by remember {
        mutableStateOf(
            if (uiState.config != null) {
                ApiBasePathUtils.buildFullServerUrl(
                    uiState.config!!.serverUrl,
                    uiState.config!!.apiBasePath,
                )
            } else {
                ""
            },
        )
    }
    var apiKey by remember { mutableStateOf(uiState.config?.apiKey ?: "") }
    var syncIntervalMinutes by remember {
        mutableStateOf(uiState.config?.syncIntervalMinutes ?: 5)
    }
    var localError by remember { mutableStateOf<String?>(null) }
    var apiKeyVisible by remember { mutableStateOf(false) }
    var hasSubmitted by remember { mutableStateOf(false) }

    // Navigate to sync screen on successful validation (only after user submitted)
    LaunchedEffect(uiState.isValidating, uiState.config, uiState.validationError, uiState.pendingUsernameChange) {
        if (hasSubmitted && !uiState.isValidating && uiState.config != null && uiState.validationError == null && uiState.pendingUsernameChange == null) {
            onNavigateToSync()
        }
    }

    // Map server-side validation error to localized string
    val remoteError = when (uiState.validationError) {
        "invalid_credentials" -> stringResource(R.string.sync_error_invalid_credentials)
        "not_found" -> stringResource(R.string.sync_error_not_found)
        "server_error" -> stringResource(R.string.sync_error_server)
        "network_error" -> stringResource(R.string.sync_error_network)
        "timeout" -> stringResource(R.string.sync_error_timeout)
        "data_reset_failed" -> stringResource(R.string.sync_username_change_data_reset_failed)
        "invalid_input" -> localError
        null -> null
        else -> uiState.validationError
    }

    val errorText = localError ?: remoteError

    // Username change confirmation dialog
    uiState.pendingUsernameChange?.let { pending ->
        UsernameChangeConfirmationDialog(
            previousUsername = pending.previousUsername,
            newUsername = pending.newUsername,
            isDeletingData = uiState.isDeletingData,
            onConfirm = { viewModel.confirmUsernameChange() },
            onCancel = { viewModel.cancelUsernameChange() },
        )
    }

    SyncConfigContent(
        serverUrl = serverUrl,
        apiKey = apiKey,
        syncIntervalMinutes = syncIntervalMinutes,
        apiKeyVisible = apiKeyVisible,
        errorText = errorText,
        isValidating = uiState.isValidating,
        onServerUrlChange = { value ->
            serverUrl = value
            localError = null
            viewModel.clearValidationError()
            viewModel.clearFieldError("serverUrl")
        },
        onApiKeyChange = { value ->
            apiKey = value
            localError = null
            viewModel.clearValidationError()
            viewModel.clearFieldError("apiKey")
        },
        onSyncIntervalChange = { value -> syncIntervalMinutes = value },
        onToggleApiKeyVisibility = { apiKeyVisible = !apiKeyVisible },
        onValidate = {
            val urlTrimmed = serverUrl.trim()
            val keyTrimmed = apiKey.trim()

            when {
                urlTrimmed.isBlank() -> {
                    localError = "url_required"
                }
                keyTrimmed.isBlank() -> {
                    localError = "api_key_required"
                }
                else -> {
                    val parseResult = ApiBasePathUtils.validateAndParseServerUrl(urlTrimmed)
                    parseResult.fold(
                        onSuccess = { parsedUrl ->
                            localError = null
                            hasSubmitted = true
                            val normalizedBasePath = ApiBasePathUtils.normalizeApiBasePath(parsedUrl.apiBasePath)
                            viewModel.validateAndSave(parsedUrl.serverUrl, keyTrimmed, normalizedBasePath, syncIntervalMinutes)
                        },
                        onFailure = { throwable ->
                            val validationError = (throwable as? UrlValidationException)?.error
                            localError = when (validationError) {
                                UrlValidationError.MISSING_SCHEME -> "url_missing_scheme"
                                UrlValidationError.CONTAINS_WHITESPACE -> "url_contains_whitespace"
                                UrlValidationError.INVALID_HOST -> "url_invalid_host"
                                null -> "url_invalid_host"
                            }
                        },
                    )
                }
            }
        },
        onCancel = {
            serverUrl = ""
            apiKey = ""
            syncIntervalMinutes = 5
            localError = null
            viewModel.clearValidationError()
            onNavigateBack()
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun SyncConfigContent(
    serverUrl: String,
    apiKey: String,
    syncIntervalMinutes: Int,
    apiKeyVisible: Boolean,
    errorText: String?,
    isValidating: Boolean,
    onServerUrlChange: (String) -> Unit,
    onApiKeyChange: (String) -> Unit,
    onSyncIntervalChange: (Int) -> Unit,
    onToggleApiKeyVisibility: () -> Unit,
    onValidate: () -> Unit,
    onCancel: () -> Unit,
) {
    val urlRequiredText = stringResource(R.string.sync_validation_url_required)
    val apiKeyRequiredText = stringResource(R.string.sync_validation_api_key_required)
    val urlMissingSchemeText = stringResource(R.string.sync_validation_url_missing_scheme)
    val urlContainsWhitespaceText = stringResource(R.string.sync_validation_url_contains_whitespace)
    val urlInvalidHostText = stringResource(R.string.sync_validation_url_invalid_host)

    // Resolve the error display string
    val displayError = when (errorText) {
        "url_required" -> urlRequiredText
        "api_key_required" -> apiKeyRequiredText
        "url_missing_scheme" -> urlMissingSchemeText
        "url_contains_whitespace" -> urlContainsWhitespaceText
        "url_invalid_host" -> urlInvalidHostText
        else -> errorText
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        OutlinedTextField(
            value = serverUrl,
            onValueChange = onServerUrlChange,
            label = { Text(stringResource(R.string.sync_server_url)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth(),
            enabled = !isValidating,
        )

        OutlinedTextField(
            value = apiKey,
            onValueChange = onApiKeyChange,
            label = { Text(stringResource(R.string.sync_api_key)) },
            singleLine = true,
            visualTransformation = if (apiKeyVisible) {
                VisualTransformation.None
            } else {
                PasswordVisualTransformation()
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = onToggleApiKeyVisibility) {
                    Icon(
                        imageVector = if (apiKeyVisible) {
                            Icons.Outlined.VisibilityOff
                        } else {
                            Icons.Outlined.Visibility
                        },
                        contentDescription = if (apiKeyVisible) {
                            "Hide API key"
                        } else {
                            "Show API key"
                        },
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isValidating,
        )

        // Sync interval dropdown
        var intervalExpanded by remember { mutableStateOf(false) }

        ExposedDropdownMenuBox(
            expanded = intervalExpanded,
            onExpandedChange = { if (!isValidating) intervalExpanded = it },
        ) {
            OutlinedTextField(
                value = stringResource(R.string.sync_config_sync_interval_unit, syncIntervalMinutes),
                onValueChange = {},
                readOnly = true,
                label = { Text(stringResource(R.string.sync_config_sync_interval)) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = intervalExpanded) },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                enabled = !isValidating,
            )
            ExposedDropdownMenu(
                expanded = intervalExpanded,
                onDismissRequest = { intervalExpanded = false },
            ) {
                SYNC_INTERVAL_OPTIONS.forEach { option ->
                    DropdownMenuItem(
                        text = {
                            Text(stringResource(R.string.sync_config_sync_interval_unit, option))
                        },
                        onClick = {
                            onSyncIntervalChange(option)
                            intervalExpanded = false
                        },
                    )
                }
            }
        }

        if (displayError != null) {
            Text(
                text = displayError,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f),
                enabled = !isValidating,
            ) {
                Text(stringResource(R.string.sync_action_cancel))
            }

            Button(
                onClick = onValidate,
                modifier = Modifier.weight(1f),
                enabled = !isValidating,
            ) {
                if (isValidating) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text(stringResource(R.string.sync_action_validate))
                }
            }
        }
    }
}
