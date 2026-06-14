package com.codenized.planixor.ui.settings

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel responsible for managing the locale preference.
 * Reads the persisted locale on init and exposes it as a StateFlow.
 * Falls back to "es" (Spanish) if the stored value is missing or invalid.
 * Applies the locale change via AppCompatDelegate for immediate effect.
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _locale = MutableStateFlow("es")
    val locale: StateFlow<String> = _locale.asStateFlow()

    init {
        loadPersistedLocale()
    }

    fun setLocale(value: String) {
        _locale.value = value
        applyLocale(value)
        viewModelScope.launch {
            preferencesRepository.setLocale(value)
        }
    }

    private fun loadPersistedLocale() {
        viewModelScope.launch {
            val stored = preferencesRepository.localeFlow.first()
            val validLocale = stored.toValidLocale()
            _locale.value = validLocale
            applyLocale(validLocale)
        }
    }

    private fun applyLocale(locale: String) {
        val localeList = LocaleListCompat.forLanguageTags(locale)
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    companion object {
        private val VALID_LOCALES = setOf("es", "en")

        private fun String?.toValidLocale(): String = when {
            this == null -> "es"
            this !in VALID_LOCALES -> "es"
            else -> this
        }
    }
}
