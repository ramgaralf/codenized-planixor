package com.codenized.planixor.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.LocalThemeViewModel
import com.codenized.planixor.R
import com.codenized.planixor.model.ThemeMode
import com.codenized.planixor.ui.theme.ThemeViewModel

@Composable
fun SettingsScreen(
    settingsViewModel: SettingsViewModel = hiltViewModel(),
) {
    val themeViewModel = LocalThemeViewModel.current
    val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()
    val selectedLocale by settingsViewModel.locale.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
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
    }
}

@Composable
private fun ThemeOptions(
    selectedTheme: ThemeMode,
    onThemeSelected: (ThemeMode) -> Unit,
) {
    Column(modifier = Modifier.selectableGroup()) {
        ThemeRadioOption(
            label = stringResource(R.string.settings_theme_light),
            selected = selectedTheme == ThemeMode.Light,
            onClick = { onThemeSelected(ThemeMode.Light) },
        )
        ThemeRadioOption(
            label = stringResource(R.string.settings_theme_dark),
            selected = selectedTheme == ThemeMode.Dark,
            onClick = { onThemeSelected(ThemeMode.Dark) },
        )
        ThemeRadioOption(
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
        ThemeRadioOption(
            label = stringResource(R.string.settings_language_spanish),
            selected = selectedLocale == "es",
            onClick = { onLocaleSelected("es") },
        )
        ThemeRadioOption(
            label = stringResource(R.string.settings_language_english),
            selected = selectedLocale == "en",
            onClick = { onLocaleSelected("en") },
        )
    }
}

@Composable
private fun ThemeRadioOption(
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
