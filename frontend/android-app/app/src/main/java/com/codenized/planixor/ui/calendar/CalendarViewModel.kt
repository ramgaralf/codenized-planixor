package com.codenized.planixor.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.CalendarEventRepository
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderRepository
import com.codenized.planixor.data.local.ShiftRepository
import com.codenized.planixor.data.notification.NotificationService
import com.codenized.planixor.domain.model.CalendarEvent
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.domain.validation.CalendarEventValidation
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.calendar.components.EventTypeOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.temporal.TemporalAdjusters
import javax.inject.Inject

/**
 * ViewModel responsible for managing calendar navigation state, event data,
 * and the event form state (create/edit).
 *
 * Form state manages startDay, endDay, startTime, endTime, totalHours (computed),
 * eventType, eventTypeId, notes, and conditional time editability.
 *
 * When a shift is selected: startTime/endTime are auto-populated from the shift
 * definition as read-only; totalHours = shift's hoursWorked; endDay is auto-computed
 * via computeEndDayForShift() if crossing midnight.
 *
 * When a reminder is selected: startTime/endTime are editable via timepickers;
 * totalHours is recalculated on every time/day change via computeTotalHours().
 *
 * Validates: Requirements 1.5, 1.6, 9.1–9.7
 */
@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val shiftRepository: ShiftRepository,
    private val reminderRepository: ReminderRepository,
    private val calendarEventRepository: CalendarEventRepository,
    private val notificationService: NotificationService,
) : ViewModel() {

    private val _activeView = MutableStateFlow(CalendarView.Day)
    val activeView: StateFlow<CalendarView> = _activeView.asStateFlow()

    private val _currentDate = MutableStateFlow(LocalDate.now())
    val currentDate: StateFlow<LocalDate> = _currentDate.asStateFlow()

    private val _events = MutableStateFlow<List<CalendarEventDisplay>>(emptyList())
    val events: StateFlow<List<CalendarEventDisplay>> = _events.asStateFlow()

    private val _formState = MutableStateFlow(EventFormUiState())
    val formState: StateFlow<EventFormUiState> = _formState.asStateFlow()

    init {
        loadPersistedView()
        observeEvents()
        observeMidnight()
    }

    // region Navigation

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

    fun navigateDay(delta: Int) {
        _currentDate.value = _currentDate.value.plusDays(delta.toLong())
    }

    fun navigateWeek(delta: Int) {
        _currentDate.value = _currentDate.value.plusWeeks(delta.toLong())
    }

    fun navigateMonth(delta: Int) {
        _currentDate.value = _currentDate.value.plusMonths(delta.toLong())
    }

    fun navigateYear(delta: Int) {
        _currentDate.value = _currentDate.value.plusYears(delta.toLong())
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

    fun navigateToDate(date: LocalDate) {
        _currentDate.value = date
    }

    // endregion

    // region Form State Management

    /**
     * Initializes form state for creating a new event.
     * Pre-selects startDay and endDay based on current view context.
     * Loads available event type options (active, non-deleted shifts/reminders).
     *
     * Validates: Requirements 9.1–9.7
     */
    fun initCreateForm() {
        val preSelectedDay = computePreSelectedDay()
        val now = LocalTime.now()
        val currentMinutes = now.hour * 60 + now.minute
        val roundedStart = ((currentMinutes + 29) / 30 * 30).coerceAtMost(1410)
        val defaultEndMinutes = (roundedStart + 60).coerceAtMost(1439)

        _formState.value = EventFormUiState(
            startDay = preSelectedDay,
            endDay = preSelectedDay,
            startTimeHours = roundedStart / 60,
            startTimeMinutes = roundedStart % 60,
            endTimeHours = defaultEndMinutes / 60,
            endTimeMinutes = defaultEndMinutes % 60,
            isLoading = true,
        )
        loadEventTypeOptions()
    }

    /**
     * Initializes form state for creating a new event with a specific pre-selected date.
     * Used when navigating from a calendar view with a date different from today.
     * This ensures the navigated date is used instead of LocalDate.now().
     *
     * Validates: Requirements 5.1, 5.2, 5.3, 8.4
     */
    fun initCreateFormWithDate(preSelectedDate: LocalDate) {
        val now = LocalTime.now()
        val currentMinutes = now.hour * 60 + now.minute
        val roundedStart = ((currentMinutes + 29) / 30 * 30).coerceAtMost(1410)
        val defaultEndMinutes = (roundedStart + 60).coerceAtMost(1439)

        _formState.value = EventFormUiState(
            startDay = preSelectedDate,
            endDay = preSelectedDate,
            startTimeHours = roundedStart / 60,
            startTimeMinutes = roundedStart % 60,
            endTimeHours = defaultEndMinutes / 60,
            endTimeMinutes = defaultEndMinutes % 60,
            isLoading = true,
        )
        loadEventTypeOptions()
    }

    /**
     * Initializes form state for editing an existing event.
     * Pre-populates all fields from the existing event.
     */
    fun initEditForm(event: CalendarEventDisplay) {
        val startTimeMinutes = event.startTime
        val endTimeMinutes = event.endTime
        val isShift = event.eventType == "shift"

        _formState.value = EventFormUiState(
            eventType = event.eventType,
            eventTypeId = event.eventTypeId,
            startDay = LocalDate.parse(event.startDay),
            endDay = LocalDate.parse(event.endDay),
            startTimeHours = startTimeMinutes / 60,
            startTimeMinutes = startTimeMinutes % 60,
            endTimeHours = endTimeMinutes / 60,
            endTimeMinutes = endTimeMinutes % 60,
            totalHours = event.totalHours,
            isTimeEditable = !isShift,
            notes = event.notes ?: "",
            alertOffsets = event.alertOffsets,
            derivedName = event.name,
            derivedIcon = event.icon,
            derivedBackgroundColor = event.backgroundColor,
            isLoading = true,
        )
        loadEventTypeOptions()
    }

    /**
     * Handles event type selection from the Event_Type_Selector.
     * Looks up the shift/reminder definition and auto-populates fields.
     *
     * For shifts: sets startTime, endTime (read-only), totalHours from hoursWorked,
     * and computes endDay via computeEndDayForShift() (crossing midnight).
     *
     * For reminders: times remain editable, recalculates totalHours.
     *
     * Validates: Requirements 1.5, 1.6
     */
    fun selectEventType(eventType: String, eventTypeId: String) {
        viewModelScope.launch {
            if (eventType == "shift") {
                val shift = shiftRepository.getById(eventTypeId)
                if (shift != null) {
                    val currentStartDay = _formState.value.startDay?.toString() ?: LocalDate.now().toString()
                    val endDayStr = CalendarEventValidation.computeEndDayForShift(
                        currentStartDay,
                        shift.startTime,
                        shift.endTime,
                    )
                    val endDay = LocalDate.parse(endDayStr)

                    _formState.update { current ->
                        current.copy(
                            eventType = eventType,
                            eventTypeId = eventTypeId,
                            startTimeHours = shift.startTime / 60,
                            startTimeMinutes = shift.startTime % 60,
                            endTimeHours = shift.endTime / 60,
                            endTimeMinutes = shift.endTime % 60,
                            totalHours = shift.hoursWorked,
                            endDay = endDay,
                            isTimeEditable = false,
                            derivedName = shift.name,
                            derivedIcon = shift.icon,
                            derivedBackgroundColor = shift.backgroundColor,
                            errors = current.errors - setOf("eventType", "eventTypeId", "startTime", "endTime", "endDay"),
                            formError = null,
                        )
                    }
                } else {
                    _formState.update { current ->
                        current.copy(
                            eventType = eventType,
                            eventTypeId = eventTypeId,
                            errors = current.errors - setOf("eventType", "eventTypeId"),
                            formError = null,
                        )
                    }
                }
            } else {
                val reminder = reminderRepository.getById(eventTypeId)
                // Reset times to rounded 30 min → +1 hour
                val now = LocalTime.now()
                val currentMinutes = now.hour * 60 + now.minute
                val roundedStart = ((currentMinutes + 29) / 30 * 30).coerceAtMost(1410)
                val endMinutes = (roundedStart + 60).coerceAtMost(1439)

                _formState.update { current ->
                    val updatedState = current.copy(
                        eventType = eventType,
                        eventTypeId = eventTypeId,
                        isTimeEditable = true,
                        startTimeHours = roundedStart / 60,
                        startTimeMinutes = roundedStart % 60,
                        endTimeHours = endMinutes / 60,
                        endTimeMinutes = endMinutes % 60,
                        derivedName = reminder?.name ?: "",
                        derivedIcon = reminder?.icon ?: "",
                        derivedBackgroundColor = reminder?.backgroundColor ?: "",
                        errors = current.errors - setOf("eventType", "eventTypeId"),
                        formError = null,
                    )
                    updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
                }
            }
        }
    }

    /**
     * Updates the start day and recalculates dependent fields.
     * For shifts: recomputes endDay via crossing midnight rule.
     * For reminders: recalculates totalHours.
     */
    fun onStartDaySelected(day: LocalDate) {
        _formState.update { current ->
            // If endDay is before the new startDay, auto-correct endDay = startDay
            val correctedEndDay = if (current.endDay != null && current.endDay < day) day else current.endDay

            val updatedState = current.copy(
                startDay = day,
                endDay = correctedEndDay,
                errors = current.errors - "startDay",
            )

            if (current.eventType == "shift" && current.startTimeHours != null && current.endTimeHours != null) {
                val startTime = current.startTimeHours * 60 + (current.startTimeMinutes ?: 0)
                val endTime = current.endTimeHours * 60 + (current.endTimeMinutes ?: 0)
                val endDayStr = CalendarEventValidation.computeEndDayForShift(
                    day.toString(),
                    startTime,
                    endTime,
                )
                updatedState.copy(endDay = LocalDate.parse(endDayStr))
            } else if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates the end day and recalculates totalHours for reminders.
     */
    fun onEndDaySelected(day: LocalDate) {
        _formState.update { current ->
            val updatedState = current.copy(
                endDay = day,
                errors = current.errors - "endDay",
            )
            if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates start time and recalculates totalHours for reminders.
     * For shifts this should not be called (times are read-only).
     *
     * Rule: if the new start time >= current end time, auto-adjust end time to start + 30 min.
     */
    fun onStartTimeSelected(hours: Int, minutes: Int) {
        _formState.update { current ->
            val newStartTotal = hours * 60 + minutes
            val currentEndTotal = if (current.endTimeHours != null && current.endTimeMinutes != null) {
                current.endTimeHours * 60 + current.endTimeMinutes
            } else null

            val adjustEnd = currentEndTotal != null && currentEndTotal <= newStartTotal
            val adjustedEndTotal = if (adjustEnd) (newStartTotal + 30).coerceAtMost(1439) else null

            val updatedState = current.copy(
                startTimeHours = hours,
                startTimeMinutes = minutes,
                endTimeHours = if (adjustedEndTotal != null) adjustedEndTotal / 60 else current.endTimeHours,
                endTimeMinutes = if (adjustedEndTotal != null) adjustedEndTotal % 60 else current.endTimeMinutes,
                errors = current.errors - "startTime",
            )
            if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates end time and recalculates totalHours for reminders.
     * For shifts this should not be called (times are read-only).
     */
    fun onEndTimeSelected(hours: Int, minutes: Int) {
        _formState.update { current ->
            val updatedState = current.copy(
                endTimeHours = hours,
                endTimeMinutes = minutes,
                errors = current.errors - "endTime",
            )
            if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates the notes field.
     */
    fun onNotesChanged(notes: String) {
        _formState.update { current ->
            current.copy(
                notes = notes,
                errors = current.errors - "notes",
            )
        }
    }

    /**
     * Updates the alert offsets selection.
     * Stores the selected alert offsets in the form state.
     */
    fun onAlertOffsetsChanged(offsets: List<Int>) {
        _formState.update { current ->
            current.copy(alertOffsets = offsets)
        }
    }

    /**
     * Saves the current form state as a new calendar event.
     * Returns true on success, false on validation error.
     */
    fun saveEvent(onSuccess: () -> Unit) {
        val state = _formState.value
        val eventType = state.eventType ?: return
        val eventTypeId = state.eventTypeId ?: return
        val startDay = state.startDay?.toString() ?: return
        val endDay = state.endDay?.toString() ?: return
        val startTime = if (state.startTimeHours != null && state.startTimeMinutes != null) {
            state.startTimeHours * 60 + state.startTimeMinutes
        } else return
        val endTime = if (state.endTimeHours != null && state.endTimeMinutes != null) {
            state.endTimeHours * 60 + state.endTimeMinutes
        } else return

        _formState.update { it.copy(isSubmitting = true) }

        viewModelScope.launch {
            val shiftHoursWorked = if (eventType == "shift") state.totalHours else null
            val result = calendarEventRepository.create(
                eventType = eventType,
                eventTypeId = eventTypeId,
                startDay = startDay,
                endDay = endDay,
                startTime = startTime,
                endTime = endTime,
                notes = state.notes.ifBlank { null },
                shiftHoursWorked = shiftHoursWorked,
                alertOffsets = state.alertOffsets,
            )

            when (result) {
                is com.codenized.planixor.data.local.CalendarEventResult.Success -> {
                    // Reconcile notifications after event is persisted
                    if (state.alertOffsets.isNotEmpty()) {
                        notificationService.reconcileNotifications(result.event)
                    }
                    notificationService.runCheckCycle()
                    resetForm()
                    onSuccess()
                }
                is com.codenized.planixor.data.local.CalendarEventResult.ValidationError -> {
                    _formState.update { it.copy(
                        isSubmitting = false,
                        formError = result.message,
                    ) }
                }
            }
        }
    }

    /**
     * Loads an existing event for editing by its ID.
     * Resolves display fields and pre-populates the form state.
     */
    fun loadEventForEdit(eventId: String) {
        viewModelScope.launch {
            _formState.update { it.copy(isLoading = true) }
            val entity = calendarEventRepository.getById(eventId)
            if (entity != null) {
                val display = resolveDisplayFields(entity)
                initEditForm(display)
            } else {
                _formState.update { it.copy(isLoading = false, formError = "Event not found") }
            }
        }
    }

    /**
     * Updates an existing calendar event with the current form state.
     */
    fun updateEvent(eventId: String, onSuccess: () -> Unit) {
        val state = _formState.value
        val eventType = state.eventType ?: return
        val eventTypeId = state.eventTypeId ?: return
        val startDay = state.startDay?.toString() ?: return
        val endDay = state.endDay?.toString() ?: return
        val startTime = if (state.startTimeHours != null && state.startTimeMinutes != null) {
            state.startTimeHours * 60 + state.startTimeMinutes
        } else return
        val endTime = if (state.endTimeHours != null && state.endTimeMinutes != null) {
            state.endTimeHours * 60 + state.endTimeMinutes
        } else return

        _formState.update { it.copy(isSubmitting = true) }

        viewModelScope.launch {
            val shiftHoursWorked = if (eventType == "shift") state.totalHours else null
            val result = calendarEventRepository.update(
                id = eventId,
                eventType = eventType,
                eventTypeId = eventTypeId,
                startDay = startDay,
                endDay = endDay,
                startTime = startTime,
                endTime = endTime,
                notes = state.notes.ifBlank { null },
                shiftHoursWorked = shiftHoursWorked,
                alertOffsets = state.alertOffsets,
            )

            when (result) {
                is com.codenized.planixor.data.local.CalendarEventResult.Success -> {
                    // Reconcile notifications after event is persisted —
                    // handles both alertOffsets changes and start time changes
                    notificationService.reconcileNotifications(result.event)
                    notificationService.runCheckCycle()
                    resetForm()
                    onSuccess()
                }
                is com.codenized.planixor.data.local.CalendarEventResult.ValidationError -> {
                    _formState.update { it.copy(
                        isSubmitting = false,
                        formError = result.message,
                    ) }
                }
            }
        }
    }

    /**
     * Soft-deletes an event by ID and navigates back on success.
     */
    fun deleteEvent(eventId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val result = calendarEventRepository.softDelete(eventId)
            when (result) {
                is com.codenized.planixor.data.local.CalendarEventResult.Success -> {
                    // Cascade soft-delete all notifications for this event
                    notificationService.deleteNotificationsForEvent(eventId)
                    notificationService.runCheckCycle()
                    resetForm()
                    onSuccess()
                }
                is com.codenized.planixor.data.local.CalendarEventResult.ValidationError -> {
                    _formState.update { it.copy(formError = result.message) }
                }
            }
        }
    }

    /**
     * Resets the form state back to initial (for cancel or after successful save).
     */
    fun resetForm() {
        val preSelectedDay = computePreSelectedDay()
        _formState.value = EventFormUiState(
            startDay = preSelectedDay,
            endDay = preSelectedDay,
        )
    }

    // endregion

    // region Private helpers

    /**
     * Computes the pre-selected day based on the current navigated date.
     * All view modes consistently use the navigated-to date from the ViewModel state.
     *
     * Validates: Requirements 5.1, 5.2, 5.3, 8.4
     */
    private fun computePreSelectedDay(): LocalDate {
        return _currentDate.value
    }

    /**
     * Recalculates totalHours for a reminder event based on current form state.
     * Returns null if required fields are not yet populated.
     */
    private fun recalculateTotalHoursForReminder(state: EventFormUiState): Int? {
        val startDay = state.startDay ?: return null
        val endDay = state.endDay ?: return null
        val startTimeHours = state.startTimeHours ?: return null
        val startTimeMinutes = state.startTimeMinutes ?: 0
        val endTimeHours = state.endTimeHours ?: return null
        val endTimeMinutes = state.endTimeMinutes ?: 0

        val startTime = startTimeHours * 60 + startTimeMinutes
        val endTime = endTimeHours * 60 + endTimeMinutes

        return CalendarEventValidation.computeTotalHours(
            eventType = "reminder",
            startDay = startDay.toString(),
            endDay = endDay.toString(),
            startTime = startTime,
            endTime = endTime,
        )
    }

    /**
     * Loads event type options (active, non-deleted shifts and reminders).
     */
    private fun loadEventTypeOptions() {
        viewModelScope.launch {
            val shifts = shiftRepository.getAllActive().first()
            val reminders = reminderRepository.getActiveForCalendarSelection().first()

            val options = mutableListOf<EventTypeOption>()
            shifts.filter { it.isActive && !it.isDeleted }.forEach { shift ->
                options.add(
                    EventTypeOption(
                        id = shift.id,
                        eventType = "shift",
                        name = shift.name,
                        icon = shift.icon,
                        backgroundColor = shift.backgroundColor,
                        displayLabel = "Turno: ${shift.name}",
                        startTime = shift.startTime,
                        endTime = shift.endTime,
                    ),
                )
            }
            reminders.filter { it.isActive && !it.isDeleted }.forEach { reminder ->
                options.add(
                    EventTypeOption(
                        id = reminder.id,
                        eventType = "reminder",
                        name = reminder.name,
                        icon = reminder.icon,
                        backgroundColor = reminder.backgroundColor,
                        displayLabel = "Recordatorio: ${reminder.name}",
                    ),
                )
            }

            options.sortWith(compareBy({ it.eventType != "shift" }, { it.name }))

            _formState.update { current ->
                current.copy(
                    eventTypeOptions = options,
                    isLoading = false,
                )
            }
        }
    }

    private fun loadPersistedView() {
        viewModelScope.launch {
            val stored = preferencesRepository.activeViewFlow.first()
            _activeView.value = stored.toCalendarView()
        }
    }

    /**
     * Monitors for midnight crossing and advances the calendar date.
     * Checks every 30 seconds if the day has changed.
     * Uses Dispatchers.Default to avoid blocking test dispatchers.
     */
    private fun observeMidnight() {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.Default) {
            var lastKnownDay = LocalDate.now()
            while (true) {
                kotlinx.coroutines.delay(30_000L)
                val today = LocalDate.now()
                if (today != lastKnownDay) {
                    lastKnownDay = today
                    // If the user was viewing the previous "today", advance to new today
                    val previousToday = today.minusDays(1)
                    if (_currentDate.value == previousToday) {
                        _currentDate.value = today
                    }
                }
            }
        }
    }

    /**
     * Observes calendar events reactively based on current date and active view.
     * Computes the date range for the view, queries the repository, and resolves display fields.
     * Uses Dispatchers.Default to avoid blocking test dispatchers.
     */
    private fun observeEvents() {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.Default) {
            combine(_currentDate, _activeView) { date, view ->
                getDateRangeForView(date, view)
            }.flatMapLatest { (start, end) ->
                calendarEventRepository.getByDateRange(start, end)
            }.map { entities ->
                entities.map { entity ->
                    resolveDisplayFields(entity)
                }
            }.collect { displayEvents ->
                _events.value = displayEvents
            }
        }
    }

    /**
     * Computes the date range (start, end) for a given view and date.
     */
    private fun getDateRangeForView(date: LocalDate, view: CalendarView): Pair<String, String> {
        return when (view) {
            CalendarView.Day -> {
                val dayStr = date.toString()
                Pair(dayStr, dayStr)
            }
            CalendarView.Week -> {
                val monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                val sunday = monday.plusDays(6)
                Pair(monday.toString(), sunday.toString())
            }
            CalendarView.Month -> {
                val ym = YearMonth.from(date)
                val firstOfMonth = ym.atDay(1)
                // Include leading/trailing days from adjacent months (up to 6 weeks grid)
                val startDow = firstOfMonth.dayOfWeek
                val leadingDays = (startDow.value - DayOfWeek.MONDAY.value + 7) % 7
                val gridStart = firstOfMonth.minusDays(leadingDays.toLong())
                val gridEnd = gridStart.plusDays(41) // 6 weeks = 42 days
                Pair(gridStart.toString(), gridEnd.toString())
            }
            CalendarView.Year -> {
                Pair("${date.year}-01-01", "${date.year}-12-31")
            }
        }
    }

    /**
     * Resolves display fields (name, icon, backgroundColor) from the referenced shift/reminder.
     */
    private suspend fun resolveDisplayFields(
        entity: com.codenized.planixor.data.local.CalendarEventEntity,
    ): CalendarEventDisplay {
        val domainEvent = CalendarEvent(
            id = entity.id,
            eventType = entity.eventType,
            eventTypeId = entity.eventTypeId,
            startDay = entity.startDay,
            endDay = entity.endDay,
            startTime = entity.startTime,
            endTime = entity.endTime,
            totalHours = entity.totalHours,
            notes = entity.notes,
            alertOffsets = com.codenized.planixor.data.local.CalendarEventRepository.deserializeAlertOffsets(entity.alertOffsets),
            modifiedAt = entity.modifiedAt,
            syncedAt = entity.syncedAt,
            isDeleted = entity.isDeleted,
        )

        var name: String? = null
        var icon: String? = null
        var backgroundColor: String? = null

        if (entity.eventType == "shift") {
            val shift = shiftRepository.getById(entity.eventTypeId)
            if (shift != null) {
                name = shift.name
                icon = shift.icon
                backgroundColor = shift.backgroundColor
            }
        } else {
            val reminder = reminderRepository.getById(entity.eventTypeId)
            if (reminder != null) {
                name = reminder.name
                icon = reminder.icon
                backgroundColor = reminder.backgroundColor
            }
        }

        return CalendarEventDisplay.fromEvent(domainEvent, name, icon, backgroundColor)
    }

    // endregion

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
