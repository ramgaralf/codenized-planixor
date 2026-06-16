package com.codenized.planixor.ui.calendar

import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.model.CalendarView
import java.time.LocalDate

/**
 * Immutable UI state for the Calendar screen.
 * Manages active view mode, current date, events list, loading/error states,
 * and view state (calendar grid vs create form vs event detail).
 */
data class CalendarUiState(
    val activeView: CalendarView = CalendarView.Day,
    val currentDate: LocalDate = LocalDate.now(),
    val events: List<CalendarEventDisplay> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val viewState: ViewState = ViewState.Calendar,
)

/**
 * Represents the current navigation state within the calendar feature.
 */
sealed class ViewState {
    data object Calendar : ViewState()
    data object Create : ViewState()
    data class Detail(val event: CalendarEventDisplay) : ViewState()
}
