package com.codenized.planixor.ui.calendar

import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.model.CalendarView
import java.time.LocalDate

/**
 * Immutable UI state for the Calendar screen.
 * Manages active view mode, current date, events list, loading/error states,
 * view state (calendar grid vs create form vs event detail), and prerequisite modal state.
 */
data class CalendarUiState(
    val activeView: CalendarView = CalendarView.Day,
    val currentDate: LocalDate = LocalDate.now(),
    val events: List<CalendarEventDisplay> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val viewState: ViewState = ViewState.Calendar,
    val showPrerequisiteDialog: Boolean = false,
    val missingShifts: Boolean = false,
    val missingReminders: Boolean = false,
)

/**
 * Represents the current navigation state within the calendar feature.
 */
sealed class ViewState {
    data object Calendar : ViewState()
    data object Create : ViewState()
    data class Detail(val event: CalendarEventDisplay) : ViewState()
}

/**
 * Result of checking whether the user meets the prerequisites to create a calendar event.
 * Prerequisites require at least one active (non-deleted) shift and one active (non-deleted) reminder.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
data class PrerequisiteResult(
    val canCreate: Boolean,
    val missingShifts: Boolean,
    val missingReminders: Boolean,
)

/**
 * UI state for the prerequisite dialog.
 */
data class PrerequisiteDialogState(
    val showDialog: Boolean = false,
    val missingShifts: Boolean = false,
    val missingReminders: Boolean = false,
)
