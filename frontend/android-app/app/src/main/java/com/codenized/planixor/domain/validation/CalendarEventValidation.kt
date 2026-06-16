package com.codenized.planixor.domain.validation

import com.codenized.planixor.domain.model.CalendarEvent

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
    private const val MAX_NOTES_LENGTH = 200

    /**
     * Validates that the end time is strictly after the start time.
     * Both values are minutes from midnight (0–1439).
     *
     * Validates: Requirements 1.8, 11.5
     */
    fun validateTimeRange(startTime: Int, endTime: Int): Boolean {
        return endTime > startTime
    }

    /**
     * Validates all required fields on a calendar event.
     * Returns field-level errors keyed by field name with i18n message keys.
     *
     * Validates: Requirements 1.2, 1.9, 2.1
     */
    fun validateRequiredFields(event: CalendarEvent): CalendarEventValidationResult {
        val errors = mutableMapOf<String, String>()

        if (event.eventType.isBlank()) {
            errors["eventType"] = "calendarEvent.validation.eventType.required"
        }

        if (event.eventTypeId.isBlank()) {
            errors["eventTypeId"] = "calendarEvent.validation.eventTypeId.required"
        }

        if (event.day.isBlank()) {
            errors["day"] = "calendarEvent.validation.day.required"
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
     * Returns true if notes is null or within MAX_NOTES_LENGTH (200).
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
     * - no other non-deleted shift event exists for the given day
     *   (excluding the event with excludeEventId if provided).
     *
     * Returns false (constraint violated) if a duplicate shift exists.
     *
     * Validates: Requirements 2.1, 2.3, 2.4, 2.5
     */
    fun checkOneShiftPerDay(
        day: String,
        eventType: String,
        existingEvents: List<CalendarEvent>,
        excludeEventId: String? = null,
    ): Boolean {
        if (eventType == "reminder") return true

        val conflictingShift = existingEvents.any { event ->
            event.day == day &&
                event.eventType == "shift" &&
                !event.isDeleted &&
                event.id != excludeEventId
        }

        return !conflictingShift
    }
}
