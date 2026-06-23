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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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

    var serverUrl by remember { mutableStateOf(uiState.config?.serverUrl ?: "") }
    var apiKey by remember { mutableStateOf(uiState.config?.apiKey ?: "") }
    var localError by remember { mutableStateOf<String?>(null) }
    var apiKeyVisible by remember { mutableStateOf(false) }
    var hasSubmitted by remember { mutableStateOf(false) }

    // Navigate to sync screen on successful validation (only after user submitted)
    LaunchedEffect(uiState.isValidating, uiState.config, uiState.validationError) {
        if (hasSubmitted && !uiState.isValidating && uiState.config != null && uiState.validationError == null) {
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
        "invalid_input" -> localError
        null -> null
        else -> uiState.validationError
    }

    val errorText = localError ?: remoteError

    SyncConfigContent(
        serverUrl = serverUrl,
        apiKey = apiKey,
        apiKeyVisible = apiKeyVisible,
        errorText = errorText,
        isValidating = uiState.isValidating,
        onServerUrlChange = { value ->
            serverUrl = value
            localError = null
            viewModel.clearValidationError()
        },
        onApiKeyChange = { value ->
            apiKey = value
            localError = null
            viewModel.clearValidationError()
        },
        onToggleApiKeyVisibility = { apiKeyVisible = !apiKeyVisible },
        onValidate = {
            val urlTrimmed = serverUrl.trim()
            val keyTrimmed = apiKey.trim()

            when {
                urlTrimmed.isBlank() -> {
                    localError = null
                    localError = "url_required"
                }
                keyTrimmed.isBlank() -> {
                    localError = null
                    localError = "api_key_required"
                }
                else -> {
                    localError = null
                    hasSubmitted = true
                    viewModel.validateAndSave(urlTrimmed, keyTrimmed)
                }
            }
        },
        onCancel = {
            serverUrl = ""
            apiKey = ""
            localError = null
            viewModel.clearValidationError()
            onNavigateBack()
        },
    )
}

@Composable
internal fun SyncConfigContent(
    serverUrl: String,
    apiKey: String,
    apiKeyVisible: Boolean,
    errorText: String?,
    isValidating: Boolean,
    onServerUrlChange: (String) -> Unit,
    onApiKeyChange: (String) -> Unit,
    onToggleApiKeyVisibility: () -> Unit,
    onValidate: () -> Unit,
    onCancel: () -> Unit,
) {
    val urlRequiredText = stringResource(R.string.sync_validation_url_required)
    val apiKeyRequiredText = stringResource(R.string.sync_validation_api_key_required)

    // Resolve the error display string
    val displayError = when (errorText) {
        "url_required" -> urlRequiredText
        "api_key_required" -> apiKeyRequiredText
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
