package com.codenized.planixor.domain.validation

import com.codenized.planixor.domain.model.CalendarEvent
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.choose
import io.kotest.property.arbitrary.constant
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for Android form validation (Properties 7–8).
 * Tests ShiftValidator, ReminderValidator, and CalendarEventValidation.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh32-improvements-and-bug-fixes
 *
 * **Validates: Requirements 9.1, 9.2**
 */
@OptIn(ExperimentalKotest::class)
class FormValidationPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Predefined palette for generators ---

    private val PREDEFINED_PALETTE = listOf(
        "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",
        "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",
        "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",
        "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",
        "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",
        "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",
        "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",
        "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",
        "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
    )

    // --- Shift Generators ---

    private val validShiftNameArb: Arb<String> = Arb.int(1, 50).map { len -> "S".repeat(len) }
    private val validShiftIconArb: Arb<String> = Arb.of(
        "😀", "🌙", "☀️", "🏠", "🚗", "⭐", "🔥", "💼", "🌊", "🎯",
    )
    private val validColorArb: Arb<String> = Arb.of(PREDEFINED_PALETTE)
    private val validHoursArb: Arb<Int> = Arb.int(0, 23)
    private val validMinutesArb: Arb<Int> = Arb.int(0, 59)
    private val validHoursWorkedArb: Arb<Int> = Arb.int(0, 1440)

    /** Generates a ShiftValidationInput where at least one mandatory field is empty/null. */
    private val shiftWithAtLeastOneEmptyFieldArb: Arb<ShiftValidationInput> = Arb.choose(
        1 to validShiftInputArb().map { it.copy(name = null) },
        1 to validShiftInputArb().map { it.copy(name = "   ") },
        1 to validShiftInputArb().map { it.copy(icon = null) },
        1 to validShiftInputArb().map { it.copy(icon = "") },
        1 to validShiftInputArb().map { it.copy(color = null) },
        1 to validShiftInputArb().map { it.copy(startTimeHours = null) },
        1 to validShiftInputArb().map { it.copy(startTimeMinutes = null) },
        1 to validShiftInputArb().map { it.copy(endTimeHours = null) },
        1 to validShiftInputArb().map { it.copy(endTimeMinutes = null) },
        1 to validShiftInputArb().map { it.copy(hoursWorked = null) },
    )

    private fun validShiftInputArb(): Arb<ShiftValidationInput> =
        Arb.int(1, 50).map { nameLen ->
            ShiftValidationInput(
                name = "N".repeat(nameLen),
                icon = "😀",
                color = PREDEFINED_PALETTE[0],
                startTimeHours = 8,
                startTimeMinutes = 0,
                endTimeHours = 16,
                endTimeMinutes = 0,
                hoursWorked = 480,
            )
        }

    // --- Reminder Generators ---

    private val validReminderNameArb: Arb<String> = Arb.int(1, 50).map { len -> "R".repeat(len) }
    private val validReminderIconArb: Arb<String> = Arb.of(
        "😀", "🌙", "☀️", "🏠", "🚗", "⭐", "🔥", "💼", "🌊", "🎯",
    )

    /** Generates a reminder with at least one empty mandatory field. */
    private val reminderWithAtLeastOneEmptyFieldArb: Arb<Triple<String, String, String>> = Arb.choose(
        1 to Arb.of(PREDEFINED_PALETTE).map { color -> Triple("", "😀", color) },
        1 to Arb.of(PREDEFINED_PALETTE).map { color -> Triple("   ", "😀", color) },
        1 to Arb.int(1, 50).map { len -> Triple("R".repeat(len), "", PREDEFINED_PALETTE[0]) },
        1 to Arb.int(1, 50).map { len -> Triple("R".repeat(len), "😀", "") },
    )

    // --- CalendarEvent Generators ---

    private val validEventTypeArb: Arb<String> = Arb.of("shift", "reminder")
    private val validEventTypeIdArb: Arb<String> = Arb.of(
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    )
    private val validStartDayArb: Arb<String> = Arb.of(
        "2025-01-15", "2025-06-20", "2025-12-31", "2026-03-01",
    )
    private val validTimeMinutesArb: Arb<Int> = Arb.int(0, 1439)

    /** Generates a CalendarEvent with at least one empty mandatory field. */
    private val calendarEventWithAtLeastOneEmptyFieldArb: Arb<CalendarEvent> = Arb.choose(
        1 to Arb.constant(makeValidCalendarEvent().copy(eventType = "")),
        1 to Arb.constant(makeValidCalendarEvent().copy(eventType = "   ")),
        1 to Arb.constant(makeValidCalendarEvent().copy(eventTypeId = "")),
        1 to Arb.constant(makeValidCalendarEvent().copy(eventTypeId = "   ")),
        1 to Arb.constant(makeValidCalendarEvent().copy(startDay = "")),
        1 to Arb.constant(makeValidCalendarEvent().copy(startDay = "   ")),
        1 to Arb.constant(makeValidCalendarEvent().copy(endDay = "")),
        1 to Arb.constant(makeValidCalendarEvent().copy(endDay = "   ")),
        1 to Arb.constant(makeValidCalendarEvent().copy(startTime = -1)),
        1 to Arb.constant(makeValidCalendarEvent().copy(endTime = 1440)),
    )

    private fun makeValidCalendarEvent(): CalendarEvent = CalendarEvent(
        id = "test-id",
        eventType = "shift",
        eventTypeId = "550e8400-e29b-41d4-a716-446655440000",
        startDay = "2025-06-15",
        endDay = "2025-06-15",
        startTime = 480,
        endTime = 960,
        totalHours = 480,
        modifiedAt = System.currentTimeMillis(),
    )

    // =========================================================================
    // Property 7: Form validation rejects empty mandatory fields
    // =========================================================================

    /**
     * **Validates: Requirements 9.1**
     *
     * Property 7: Form validation rejects empty mandatory fields
     *
     * For any form with N mandatory fields, when at least one mandatory field is
     * empty (null, undefined, or whitespace-only for text; unselected for other types),
     * validation SHALL fail and produce an error message for each empty mandatory field.
     */

    @Test
    fun `Property 7 - ShiftValidator rejects input with at least one empty mandatory field`() = runTest {
        checkAll(config, shiftWithAtLeastOneEmptyFieldArb) { input ->
            val result = ShiftValidator.validate(input)
            assertFalse(
                "Expected validation to fail when at least one mandatory field is empty. Input: $input",
                result.isValid,
            )
            assertTrue(
                "Expected at least one field error when a mandatory field is empty. Input: $input",
                result.errors.isNotEmpty(),
            )
        }
    }

    @Test
    fun `Property 7 - ShiftValidator rejects null name`() = runTest {
        checkAll(config, validShiftIconArb, validColorArb, validHoursArb, validMinutesArb, validHoursWorkedArb) {
                icon, color, hours, minutes, hoursWorked ->
            val input = ShiftValidationInput(
                name = null,
                icon = icon,
                color = color,
                startTimeHours = hours,
                startTimeMinutes = minutes,
                endTimeHours = hours,
                endTimeMinutes = minutes,
                hoursWorked = hoursWorked,
            )
            val result = ShiftValidator.validate(input)
            assertFalse("Expected invalid for null name", result.isValid)
            assertNotNull("Expected error on 'name' field", result.errors["name"])
        }
    }

    @Test
    fun `Property 7 - ShiftValidator rejects whitespace-only name`() = runTest {
        val whitespaceArb: Arb<String> = Arb.of("", " ", "  ", "\t", "\n", "   \t\n  ")
        checkAll(config, whitespaceArb) { name ->
            val input = ShiftValidationInput(
                name = name,
                icon = "😀",
                color = PREDEFINED_PALETTE[0],
                startTimeHours = 8,
                startTimeMinutes = 0,
                endTimeHours = 16,
                endTimeMinutes = 0,
                hoursWorked = 480,
            )
            val result = ShiftValidator.validate(input)
            assertFalse("Expected invalid for whitespace name='$name'", result.isValid)
            assertNotNull("Expected error on 'name' field for whitespace name", result.errors["name"])
        }
    }

    @Test
    fun `Property 7 - ReminderValidator rejects empty mandatory fields`() = runTest {
        checkAll(config, reminderWithAtLeastOneEmptyFieldArb) { (name, icon, color) ->
            val result = ReminderValidator.validate(name, icon, color)
            assertFalse(
                "Expected validation to fail for name='$name', icon='$icon', color='$color'",
                result.isValid,
            )
            val hasError = result.nameError != null || result.iconError != null || result.backgroundColorError != null
            assertTrue(
                "Expected at least one error field when a mandatory field is empty",
                hasError,
            )
        }
    }

    @Test
    fun `Property 7 - ReminderValidator rejects empty name`() = runTest {
        val emptyNameArb: Arb<String> = Arb.of("", " ", "  ", "\t", "\n")
        checkAll(config, emptyNameArb, validReminderIconArb, validColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertFalse("Expected invalid for empty/whitespace name='$name'", result.isValid)
            assertNotNull("Expected nameError for empty name", result.nameError)
        }
    }

    @Test
    fun `Property 7 - ReminderValidator rejects empty icon`() = runTest {
        checkAll(config, validReminderNameArb, validColorArb) { name, color ->
            val result = ReminderValidator.validate(name, "", color)
            assertFalse("Expected invalid for empty icon", result.isValid)
            assertNotNull("Expected iconError for empty icon", result.iconError)
        }
    }

    @Test
    fun `Property 7 - ReminderValidator rejects empty color`() = runTest {
        checkAll(config, validReminderNameArb, validReminderIconArb) { name, icon ->
            val result = ReminderValidator.validate(name, icon, "")
            assertFalse("Expected invalid for empty color", result.isValid)
            assertNotNull("Expected backgroundColorError for empty color", result.backgroundColorError)
        }
    }

    @Test
    fun `Property 7 - CalendarEventValidation rejects events with empty mandatory fields`() = runTest {
        checkAll(config, calendarEventWithAtLeastOneEmptyFieldArb) { event ->
            val result = CalendarEventValidation.validateRequiredFields(event)
            assertFalse(
                "Expected validation to fail for event with empty mandatory field: $event",
                result.isValid,
            )
            assertTrue(
                "Expected at least one field error for event with empty mandatory field",
                result.errors.isNotEmpty(),
            )
        }
    }

    // =========================================================================
    // Property 8: Form validation passes when all mandatory fields are valid
    // =========================================================================

    /**
     * **Validates: Requirements 9.2**
     *
     * Property 8: Form validation passes when all mandatory fields are valid
     *
     * For any form state where all mandatory fields contain non-empty values
     * satisfying their type constraints, validation SHALL produce zero errors
     * and allow submission.
     */

    @Test
    fun `Property 8 - ShiftValidator passes with all valid fields`() = runTest {
        checkAll(
            config,
            validShiftNameArb,
            validShiftIconArb,
            validColorArb,
            validHoursArb,
            validMinutesArb,
        ) { name, icon, color, hours, minutes ->
            val input = ShiftValidationInput(
                name = name,
                icon = icon,
                color = color,
                startTimeHours = hours,
                startTimeMinutes = minutes,
                endTimeHours = hours,
                endTimeMinutes = minutes,
                hoursWorked = 480,
            )
            val result = ShiftValidator.validate(input)
            assertTrue(
                "Expected valid for name='$name', icon='$icon', color='$color', " +
                    "time=$hours:$minutes. Errors: ${result.errors}",
                result.isValid,
            )
            assertTrue(
                "Expected zero errors. Got: ${result.errors}",
                result.errors.isEmpty(),
            )
        }
    }

    @Test
    fun `Property 8 - ShiftValidator passes with varying valid hoursWorked`() = runTest {
        checkAll(config, validHoursWorkedArb) { hoursWorked ->
            val input = ShiftValidationInput(
                name = "Test Shift",
                icon = "☀️",
                color = PREDEFINED_PALETTE[2],
                startTimeHours = 8,
                startTimeMinutes = 0,
                endTimeHours = 16,
                endTimeMinutes = 0,
                hoursWorked = hoursWorked,
            )
            val result = ShiftValidator.validate(input)
            assertTrue(
                "Expected valid for hoursWorked=$hoursWorked. Errors: ${result.errors}",
                result.isValid,
            )
        }
    }

    @Test
    fun `Property 8 - ShiftValidator passes with all valid time combinations`() = runTest {
        checkAll(config, validHoursArb, validMinutesArb, validHoursArb, validMinutesArb) {
                startHour, startMin, endHour, endMin ->
            val input = ShiftValidationInput(
                name = "Test Shift",
                icon = "🔥",
                color = PREDEFINED_PALETTE[5],
                startTimeHours = startHour,
                startTimeMinutes = startMin,
                endTimeHours = endHour,
                endTimeMinutes = endMin,
                hoursWorked = 480,
            )
            val result = ShiftValidator.validate(input)
            assertTrue(
                "Expected valid for start=$startHour:$startMin end=$endHour:$endMin. Errors: ${result.errors}",
                result.isValid,
            )
        }
    }

    @Test
    fun `Property 8 - ReminderValidator passes with all valid fields`() = runTest {
        checkAll(config, validReminderNameArb, validReminderIconArb, validColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertTrue(
                "Expected valid for name='$name', icon='$icon', color='$color'. " +
                    "Errors: nameError=${result.nameError}, iconError=${result.iconError}, " +
                    "colorError=${result.backgroundColorError}",
                result.isValid,
            )
            assertNull("Expected no nameError", result.nameError)
            assertNull("Expected no iconError", result.iconError)
            assertNull("Expected no backgroundColorError", result.backgroundColorError)
        }
    }

    @Test
    fun `Property 8 - CalendarEventValidation passes with all valid fields`() = runTest {
        checkAll(config, validEventTypeArb, validEventTypeIdArb, validStartDayArb, validTimeMinutesArb, validTimeMinutesArb) {
                eventType, eventTypeId, startDay, startTime, endTime ->
            val event = CalendarEvent(
                id = "test-id",
                eventType = eventType,
                eventTypeId = eventTypeId,
                startDay = startDay,
                endDay = startDay,
                startTime = startTime,
                endTime = endTime,
                totalHours = 480,
                modifiedAt = System.currentTimeMillis(),
            )
            val result = CalendarEventValidation.validateRequiredFields(event)
            assertTrue(
                "Expected valid for eventType='$eventType', eventTypeId='$eventTypeId', " +
                    "startDay='$startDay', startTime=$startTime, endTime=$endTime. Errors: ${result.errors}",
                result.isValid,
            )
            assertTrue(
                "Expected zero errors. Got: ${result.errors}",
                result.errors.isEmpty(),
            )
        }
    }

    @Test
    fun `Property 8 - CalendarEventValidation passes with boundary time values`() = runTest {
        val boundaryTimeArb: Arb<Int> = Arb.of(0, 1, 719, 720, 1438, 1439)
        checkAll(config, boundaryTimeArb, boundaryTimeArb) { startTime, endTime ->
            val event = CalendarEvent(
                id = "test-id",
                eventType = "reminder",
                eventTypeId = "550e8400-e29b-41d4-a716-446655440000",
                startDay = "2025-06-15",
                endDay = "2025-06-15",
                startTime = startTime,
                endTime = endTime,
                totalHours = 480,
                modifiedAt = System.currentTimeMillis(),
            )
            val result = CalendarEventValidation.validateRequiredFields(event)
            assertTrue(
                "Expected valid for boundary times startTime=$startTime, endTime=$endTime. Errors: ${result.errors}",
                result.isValid,
            )
        }
    }
}
