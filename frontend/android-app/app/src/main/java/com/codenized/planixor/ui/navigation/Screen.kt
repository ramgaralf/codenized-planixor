package com.codenized.planixor.ui.navigation

/**
 * Sealed class defining all navigation routes in the Planixor application.
 */
sealed class Screen(val route: String) {
    data object Calendar : Screen("calendar")
    data object EventCreate : Screen("calendar/new")
    data object EventEdit : Screen("calendar/{eventId}/edit") {
        fun createRoute(eventId: String): String = "calendar/$eventId/edit"
    }
    data object Shifts : Screen("shifts")
    data object ShiftCreate : Screen("shifts/new")
    data object ShiftEdit : Screen("shifts/{shiftId}/edit") {
        fun createRoute(shiftId: String): String = "shifts/$shiftId/edit"
    }
    data object Reminders : Screen("reminders")
    data object ReminderCreate : Screen("reminders/new")
    data object ReminderEdit : Screen("reminders/{reminderId}/edit") {
        fun createRoute(reminderId: String): String = "reminders/$reminderId/edit"
    }
    data object Reports : Screen("reports")
    data object Settings : Screen("settings")
    data object Notifications : Screen("notifications")
}
