package com.codenized.planixor

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.ui.navigation.AppNavigation
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.ThemeViewModel
import dagger.hilt.android.AndroidEntryPoint

/**
 * CompositionLocal to provide the activity-scoped ThemeViewModel
 * to all composables in the tree (ensuring a single instance).
 */
val LocalThemeViewModel = staticCompositionLocalOf<ThemeViewModel> {
    error("ThemeViewModel not provided")
}

/**
 * Single activity entry point for the Planixor application.
 * Extends AppCompatActivity to support per-app language preferences via AppCompatDelegate.
 */
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private val themeViewModel: ThemeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()

            CompositionLocalProvider(LocalThemeViewModel provides themeViewModel) {
                PlanixorTheme(themeMode = themeMode) {
                    AppNavigation()
                }
            }
        }
    }
}
