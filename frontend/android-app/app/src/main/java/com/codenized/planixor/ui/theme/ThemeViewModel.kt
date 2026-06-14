package com.codenized.planixor.ui.theme

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.model.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel responsible for managing the application theme state.
 * Reads the persisted theme on init and exposes it as a StateFlow.
 * Falls back to [ThemeMode.System] if the stored value is missing or invalid.
 */
@HiltViewModel
class ThemeViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _themeMode = MutableStateFlow(ThemeMode.System)
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    init {
        loadPersistedTheme()
    }

    fun setTheme(mode: ThemeMode) {
        _themeMode.value = mode
        viewModelScope.launch {
            preferencesRepository.setTheme(mode.toStorageValue())
        }
    }

    private fun loadPersistedTheme() {
        viewModelScope.launch {
            val stored = preferencesRepository.themeFlow.first()
            _themeMode.value = stored.toThemeMode()
        }
    }

    companion object {
        private val VALID_VALUES = setOf("light", "dark", "system")

        private fun String?.toThemeMode(): ThemeMode = when {
            this == null -> ThemeMode.System
            this !in VALID_VALUES -> ThemeMode.System
            this == "light" -> ThemeMode.Light
            this == "dark" -> ThemeMode.Dark
            else -> ThemeMode.System
        }

        private fun ThemeMode.toStorageValue(): String = when (this) {
            ThemeMode.Light -> "light"
            ThemeMode.Dark -> "dark"
            ThemeMode.System -> "system"
        }
    }
}
