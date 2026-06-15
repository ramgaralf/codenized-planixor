package com.codenized.planixor.ui.navigation

/**
 * Sealed class defining all navigation routes in the Planixor application.
 */
sealed class Screen(val route: String) {
    data object Calendar : Screen("calendar")
    data object Shifts : Screen("shifts")
    data object ShiftCreate : Screen("shifts/new")
    data object ShiftEdit : Screen("shifts/{shiftId}/edit") {
        fun createRoute(shiftId: String): String = "shifts/$shiftId/edit"
    }
    data object Reminders : Screen("reminders")
    data object Reports : Screen("reports")
    data object Settings : Screen("settings")
}
