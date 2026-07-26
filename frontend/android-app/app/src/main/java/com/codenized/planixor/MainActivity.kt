package com.codenized.planixor

import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.model.ThemeMode
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
 *
 * Edge-to-edge: enableEdgeToEdge() is called for backward compat (API 28-34).
 * On API 35+, edge-to-edge is enforced by default. The status bar icon appearance
 * is updated reactively when the theme changes.
 */
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private val themeViewModel: ThemeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()
            val isDark = when (themeMode) {
                ThemeMode.Light -> false
                ThemeMode.Dark -> true
                ThemeMode.System -> isSystemInDarkTheme()
            }

            // Update system bar icon appearance when theme changes
            LaunchedEffect(isDark) {
                enableEdgeToEdge(
                    statusBarStyle = if (isDark) {
                        SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                    } else {
                        SystemBarStyle.light(
                            android.graphics.Color.TRANSPARENT,
                            android.graphics.Color.TRANSPARENT,
                        )
                    },
                    navigationBarStyle = if (isDark) {
                        SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                    } else {
                        SystemBarStyle.light(
                            android.graphics.Color.TRANSPARENT,
                            android.graphics.Color.TRANSPARENT,
                        )
                    },
                )
            }

            CompositionLocalProvider(LocalThemeViewModel provides themeViewModel) {
                PlanixorTheme(themeMode = themeMode) {
                    AppNavigation()
                }
            }
        }
    }
}
