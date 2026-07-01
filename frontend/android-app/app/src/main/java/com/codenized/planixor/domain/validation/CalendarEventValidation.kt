package com.codenized.planixor.domain.validation

import com.codenized.planixor.domain.model.CalendarEvent
import java.time.LocalDate

/**
 * Result of calendar event validation.
 * Contains a map of field names to their corresponding i18n error keys.
 * An empty map indicates all fields are valid.
 */
data class CalendarEventValidationResult(
    val errors: Map<String, String> = emptyMap(),
) {
    val isValid: Boolean get() = errors.isEmpty()
}

/**
 * Pure domain validator for calendar event fields.
 * Matches the logic in the TypeScript validation.ts implementation.
 * No Android SDK dependencies — can be unit tested on JVM.
 */
object CalendarEventValidation {

    private const val MIN_MINUTES = 0
    private const val MAX_MINUTES = 1439
    private const val MAX_NOTES_LENGTH = 250

    /**
     * Validates that endDay is on or after startDay.
     * Both values are ISO date strings (YYYY-MM-DD).
     * String comparison works correctly for this format.
     *
     * Validates: Requirements 1.11, 11.5
     */
    fun validateDayRange(startDay: String, endDay: String): Boolean {
        return endDay >= startDay
    }

    /**
     * Validates time range for reminder events.
     *
     * Returns true if:
     * - endDay > startDay (any times are valid for multi-day reminders), OR
     * - endDay == startDay AND endTime >= startTime (allows 0 totalHours)
     *
     * For shift events this function is not applicable (shifts always pass
     * time validation since their times are read-only from the definition).
     *
     * Validates: Requirements 3.1, 3.2, 8.2
     */
    fun validateTimeForReminder(
        startDay: String,
        endDay: String,
        startTime: Int,
        endTime: Int,
    ): Boolean {
        if (endDay > startDay) {
            return true
        }
        return endTime >= startTime
    }

    /**
     * Computes the total duration in minutes for a calendar event.
     *
     * For shifts: returns the shift's hoursWorked value (passed as shiftHoursWorked).
     * For reminders: calculates from day difference × 1440 + (endTime - startTime).
     *
     * Validates: Requirements 1.5, 11.7
     */
    fun computeTotalHours(
        eventType: String,
        startDay: String,
        endDay: String,
        startTime: Int,
        endTime: Int,
        shiftHoursWorked: Int? = null,
    ): Int {
        if (eventType == "shift") {
            return shiftHoursWorked ?: 0
        }

        val start = LocalDate.parse(startDay)
        val end = LocalDate.parse(endDay)
        val dayDifference = (end.toEpochDay() - start.toEpochDay()).toInt()

        return dayDifference * 1440 + (endTime - startTime)
    }

    /**
     * Computes the endDay for a shift event based on crossing midnight or 24-hour shifts.
     *
     * If endTime <= startTime (crossing midnight or 24-hour shift): returns startDay + 1 day.
     * If endTime > startTime (same-day shift): returns startDay.
     *
     * When startTime === endTime, the shift is 24 hours (per calculateHoursWorked which
     * returns 1440 in this case), so endDay is startDay + 1.
     *
     * Validates: Requirements 1.6, 11.7
     */
    fun computeEndDayForShift(
        startDay: String,
        startTime: Int,
        endTime: Int,
    ): String {
        if (endTime <= startTime) {
            val date = LocalDate.parse(startDay)
            return date.plusDays(1).toString()
        }
        return startDay
    }

    /**
     * Validates all required fields on a calendar event.
     * Returns field-level errors keyed by field name with i18n message keys.
     *
     * Checks: eventType, eventTypeId, startDay, endDay, startTime, endTime.
     *
     * Validates: Requirements 1.2, 1.12
     */
    fun validateRequiredFields(event: CalendarEvent): CalendarEventValidationResult {
        val errors = mutableMapOf<String, String>()

        if (event.eventType.isBlank()) {
            errors["eventType"] = "calendarEvent.validation.eventType.required"
        }

        if (event.eventTypeId.isBlank()) {
            errors["eventTypeId"] = "calendarEvent.validation.eventTypeId.required"
        }

        if (event.startDay.isBlank()) {
            errors["startDay"] = "calendarEvent.validation.startDay.required"
        }

        if (event.endDay.isBlank()) {
            errors["endDay"] = "calendarEvent.validation.endDay.required"
        }

        if (event.startTime < MIN_MINUTES || event.startTime > MAX_MINUTES) {
            errors["startTime"] = "calendarEvent.validation.startTime.required"
        }

        if (event.endTime < MIN_MINUTES || event.endTime > MAX_MINUTES) {
            errors["endTime"] = "calendarEvent.validation.endTime.required"
        }

        return CalendarEventValidationResult(errors)
    }

    /**
     * Validates that notes are within the allowed length.
     * Returns true if notes is null or within MAX_NOTES_LENGTH (250).
     *
     * Validates: Requirement 1.3
     */
    fun validateNotes(notes: String?): Boolean {
        if (notes == null) return true
        return notes.length <= MAX_NOTES_LENGTH
    }

    /**
     * Checks the one-shift-per-day constraint.
     * Returns true (allowed) if:
     * - eventType is "reminder" (no constraint applies), OR
     * - no other non-deleted shift event exists with the same startDay
     *   (excluding the event with excludeEventId if provided).
     *
     * Returns false (constraint violated) if a duplicate shift exists.
     *
     * Validates: Requirements 2.1, 2.3, 2.4, 2.5
     */
    fun checkOneShiftPerDay(
        startDay: String,
        eventType: String,
        existingEvents: List<CalendarEvent>,
        excludeEventId: String? = null,
    ): Boolean {
        if (eventType == "reminder") return true

        val conflictingShift = existingEvents.any { event ->
            event.startDay == startDay &&
                event.eventType == "shift" &&
                !event.isDeleted &&
                event.id != excludeEventId
        }

        return !conflictingShift
    }
}
