package com.codenized.planixor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.codenized.planixor.ui.navigation.AppNavigation
import com.codenized.planixor.ui.theme.PlanixorTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Single activity entry point for the Planixor application.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PlanixorTheme {
                AppNavigation()
            }
        }
    }
}
