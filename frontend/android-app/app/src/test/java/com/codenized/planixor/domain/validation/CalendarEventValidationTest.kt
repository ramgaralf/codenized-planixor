package com.codenized.planixor.domain.validation

import com.codenized.planixor.domain.model.CalendarEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for CalendarEventValidation pure functions.
 * Validates that the Android implementation matches the TypeScript validation behavior.
 *
 * Validates: Requirements 1.10, 1.11, 2.1, 11.5, 11.6, 11.7
 */
class CalendarEventValidationTest {

    // --- validateDayRange ---

    @Test
    fun `validateDayRange should return true when endDay equals startDay`() {
        assertTrue(CalendarEventValidation.validateDayRange("2024-01-15", "2024-01-15"))
    }

    @Test
    fun `validateDayRange should return true when endDay is after startDay`() {
        assertTrue(CalendarEventValidation.validateDayRange("2024-01-15", "2024-01-16"))
        assertTrue(CalendarEventValidation.validateDayRange("2024-01-15", "2024-02-15"))
    }

    @Test
    fun `validateDayRange should return false when endDay is before startDay`() {
        assertFalse(CalendarEventValidation.validateDayRange("2024-01-16", "2024-01-15"))
        assertFalse(CalendarEventValidation.validateDayRange("2024-02-01", "2024-01-31"))
    }

    // --- validateTimeForReminder ---

    @Test
    fun `validateTimeForReminder should return true when endDay is after startDay regardless of times`() {
        assertTrue(CalendarEventValidation.validateTimeForReminder("2024-01-15", "2024-01-16", 1020, 480))
        assertTrue(CalendarEventValidation.validateTimeForReminder("2024-01-15", "2024-01-16", 0, 0))
    }

    @Test
    fun `validateTimeForReminder should return true when same day and endTime greater than startTime`() {
        assertTrue(CalendarEventValidation.validateTimeForReminder("2024-01-15", "2024-01-15", 480, 1020))
        assertTrue(CalendarEventValidation.validateTimeForReminder("2024-01-15", "2024-01-15", 0, 1))
    }

    @Test
    fun `validateTimeForReminder should return false when same day and endTime equals startTime`() {
        assertFalse(CalendarEventValidation.validateTimeForReminder("2024-01-15", "2024-01-15", 720, 720))
    }

    @Test
    fun `validateTimeForReminder should return false when same day and endTime less than startTime`() {
        assertFalse(CalendarEventValidation.validateTimeForReminder("2024-01-15", "2024-01-15", 1020, 480))
    }

    // --- computeTotalHours ---

    @Test
    fun `computeTotalHours should return shiftHoursWorked for shift events`() {
        assertEquals(480, CalendarEventValidation.computeTotalHours("shift", "2024-01-15", "2024-01-15", 480, 1020, 480))
    }

    @Test
    fun `computeTotalHours should return 0 for shift when shiftHoursWorked is null`() {
        assertEquals(0, CalendarEventValidation.computeTotalHours("shift", "2024-01-15", "2024-01-15", 480, 1020, null))
    }

    @Test
    fun `computeTotalHours should compute from day and time difference for reminders`() {
        // Same day: 1020 - 480 = 540 minutes
        assertEquals(540, CalendarEventValidation.computeTotalHours("reminder", "2024-01-15", "2024-01-15", 480, 1020))
        // 1 day apart: 1440 + (1020 - 480) = 1980 minutes
        assertEquals(1980, CalendarEventValidation.computeTotalHours("reminder", "2024-01-15", "2024-01-16", 480, 1020))
    }

    // --- computeEndDayForShift ---

    @Test
    fun `computeEndDayForShift should return startDay when endTime is greater than or equal to startTime`() {
        assertEquals("2024-01-15", CalendarEventValidation.computeEndDayForShift("2024-01-15", 480, 1020))
        assertEquals("2024-01-15", CalendarEventValidation.computeEndDayForShift("2024-01-15", 480, 480))
    }

    @Test
    fun `computeEndDayForShift should return startDay plus 1 when endTime is less than startTime`() {
        assertEquals("2024-01-16", CalendarEventValidation.computeEndDayForShift("2024-01-15", 1320, 360))
        assertEquals("2024-02-01", CalendarEventValidation.computeEndDayForShift("2024-01-31", 1320, 360))
    }

    // --- validateRequiredFields ---

    @Test
    fun `validateRequiredFields should return valid when all fields are present`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertTrue(result.isValid)
        assertTrue(result.errors.isEmpty())
    }

    @Test
    fun `validateRequiredFields should return error for blank eventType`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "",
            eventTypeId = "type-id",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.eventType.required", result.errors["eventType"])
    }

    @Test
    fun `validateRequiredFields should return error for blank eventTypeId`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "  ",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.eventTypeId.required", result.errors["eventTypeId"])
    }

    @Test
    fun `validateRequiredFields should return error for blank startDay`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            startDay = "",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.startDay.required", result.errors["startDay"])
    }

    @Test
    fun `validateRequiredFields should return error for blank endDay`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            startDay = "2024-01-15",
            endDay = "",
            startTime = 480,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.endDay.required", result.errors["endDay"])
    }

    @Test
    fun `validateRequiredFields should return error for startTime below 0`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = -1,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.startTime.required", result.errors["startTime"])
    }

    @Test
    fun `validateRequiredFields should return error for startTime above 1439`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1440,
            endTime = 1020,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.startTime.required", result.errors["startTime"])
    }

    @Test
    fun `validateRequiredFields should return error for endTime above 1439`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1440,
            totalHours = 540,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.endTime.required", result.errors["endTime"])
    }

    @Test
    fun `validateRequiredFields should return multiple errors when multiple fields are invalid`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "",
            eventTypeId = "",
            startDay = "",
            endDay = "",
            startTime = -1,
            endTime = 1440,
            totalHours = 0,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals(6, result.errors.size)
    }

    // --- validateNotes ---

    @Test
    fun `validateNotes should return true when notes is null`() {
        assertTrue(CalendarEventValidation.validateNotes(null))
    }

    @Test
    fun `validateNotes should return true when notes is empty`() {
        assertTrue(CalendarEventValidation.validateNotes(""))
    }

    @Test
    fun `validateNotes should return true when notes is exactly 250 characters`() {
        val notes = "A".repeat(250)
        assertTrue(CalendarEventValidation.validateNotes(notes))
    }

    @Test
    fun `validateNotes should return false when notes exceeds 250 characters`() {
        val notes = "A".repeat(251)
        assertFalse(CalendarEventValidation.validateNotes(notes))
    }

    // --- checkOneShiftPerDay ---

    @Test
    fun `checkOneShiftPerDay should return true for reminder eventType regardless of existing events`() {
        val existingEvents = listOf(
            CalendarEvent(
                id = "existing-1",
                eventType = "shift",
                eventTypeId = "shift-type-1",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                totalHours = 540,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            startDay = "2024-01-15",
            eventType = "reminder",
            existingEvents = existingEvents,
        )
        assertTrue(result)
    }

    @Test
    fun `checkOneShiftPerDay should return true when no shift exists for the day`() {
        val existingEvents = listOf(
            CalendarEvent(
                id = "existing-1",
                eventType = "reminder",
                eventTypeId = "reminder-type-1",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 480,
                endTime = 540,
                totalHours = 60,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            startDay = "2024-01-15",
            eventType = "shift",
            existingEvents = existingEvents,
        )
        assertTrue(result)
    }

    @Test
    fun `checkOneShiftPerDay should return false when shift exists for the day`() {
        val existingEvents = listOf(
            CalendarEvent(
                id = "existing-1",
                eventType = "shift",
                eventTypeId = "shift-type-1",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                totalHours = 540,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            startDay = "2024-01-15",
            eventType = "shift",
            existingEvents = existingEvents,
        )
        assertFalse(result)
    }

    @Test
    fun `checkOneShiftPerDay should respect excludeEventId and allow when conflict is the excluded event`() {
        val existingEvents = listOf(
            CalendarEvent(
                id = "existing-1",
                eventType = "shift",
                eventTypeId = "shift-type-1",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                totalHours = 540,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            startDay = "2024-01-15",
            eventType = "shift",
            existingEvents = existingEvents,
            excludeEventId = "existing-1",
        )
        assertTrue(result)
    }

    @Test
    fun `checkOneShiftPerDay should ignore deleted shift events`() {
        val existingEvents = listOf(
            CalendarEvent(
                id = "existing-1",
                eventType = "shift",
                eventTypeId = "shift-type-1",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                totalHours = 540,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = true,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            startDay = "2024-01-15",
            eventType = "shift",
            existingEvents = existingEvents,
        )
        assertTrue(result)
    }

    @Test
    fun `checkOneShiftPerDay should reject when non-excluded shift exists on same day`() {
        val existingEvents = listOf(
            CalendarEvent(
                id = "existing-1",
                eventType = "shift",
                eventTypeId = "shift-type-1",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                totalHours = 540,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
            CalendarEvent(
                id = "existing-2",
                eventType = "shift",
                eventTypeId = "shift-type-2",
                startDay = "2024-01-15",
                endDay = "2024-01-15",
                startTime = 1080,
                endTime = 1200,
                totalHours = 120,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            startDay = "2024-01-15",
            eventType = "shift",
            existingEvents = existingEvents,
            excludeEventId = "existing-1",
        )
        assertFalse(result)
    }
}
