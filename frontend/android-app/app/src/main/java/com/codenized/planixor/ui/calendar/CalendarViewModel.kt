package com.codenized.planixor.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.model.CalendarView
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * ViewModel responsible for managing calendar navigation state and event data.
 * Exposes the active view (persisted to DataStore), the current date (not persisted),
 * and filtered calendar events for the current view's date range.
 * Provides navigation functions that adjust the date based on the active view.
 */
@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _activeView = MutableStateFlow(CalendarView.Day)
    val activeView: StateFlow<CalendarView> = _activeView.asStateFlow()

    private val _currentDate = MutableStateFlow(LocalDate.now())
    val currentDate: StateFlow<LocalDate> = _currentDate.asStateFlow()

    private val _events = MutableStateFlow<List<CalendarEventDisplay>>(emptyList())
    val events: StateFlow<List<CalendarEventDisplay>> = _events.asStateFlow()

    init {
        loadPersistedView()
    }

    fun navigateForward() {
        _currentDate.value = when (_activeView.value) {
            CalendarView.Day -> _currentDate.value.plusDays(1)
            CalendarView.Week -> _currentDate.value.plusWeeks(1)
            CalendarView.Month -> _currentDate.value.plusMonths(1)
            CalendarView.Year -> _currentDate.value.plusYears(1)
        }
    }

    fun navigateBackward() {
        _currentDate.value = when (_activeView.value) {
            CalendarView.Day -> _currentDate.value.minusDays(1)
            CalendarView.Week -> _currentDate.value.minusWeeks(1)
            CalendarView.Month -> _currentDate.value.minusMonths(1)
            CalendarView.Year -> _currentDate.value.minusYears(1)
        }
    }

    fun switchView(view: CalendarView) {
        _activeView.value = view
        viewModelScope.launch {
            preferencesRepository.setActiveView(view.toStorageValue())
        }
    }

    fun goToToday() {
        _currentDate.value = LocalDate.now()
    }

    /**
     * Navigate to a specific date. Used when tapping a day in Month/Year views.
     */
    fun navigateToDate(date: LocalDate) {
        _currentDate.value = date
    }

    private fun loadPersistedView() {
        viewModelScope.launch {
            val stored = preferencesRepository.activeViewFlow.first()
            _activeView.value = stored.toCalendarView()
        }
    }

    companion object {
        private val VALID_VALUES = setOf("day", "week", "month", "year")

        private fun String?.toCalendarView(): CalendarView = when {
            this == null -> CalendarView.Day
            this !in VALID_VALUES -> CalendarView.Day
            this == "day" -> CalendarView.Day
            this == "week" -> CalendarView.Week
            this == "month" -> CalendarView.Month
            this == "year" -> CalendarView.Year
            else -> CalendarView.Day
        }

        private fun CalendarView.toStorageValue(): String = when (this) {
            CalendarView.Day -> "day"
            CalendarView.Week -> "week"
            CalendarView.Month -> "month"
            CalendarView.Year -> "year"
        }
    }
}
