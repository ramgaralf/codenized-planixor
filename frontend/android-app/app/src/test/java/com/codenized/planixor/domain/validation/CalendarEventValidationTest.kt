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
 * Validates: Requirements 1.8, 2.1, 11.5
 */
class CalendarEventValidationTest {

    // --- validateTimeRange ---

    @Test
    fun `validateTimeRange should return true when endTime is greater than startTime`() {
        assertTrue(CalendarEventValidation.validateTimeRange(0, 1))
        assertTrue(CalendarEventValidation.validateTimeRange(480, 1020))
        assertTrue(CalendarEventValidation.validateTimeRange(0, 1439))
    }

    @Test
    fun `validateTimeRange should return false when endTime equals startTime`() {
        assertFalse(CalendarEventValidation.validateTimeRange(0, 0))
        assertFalse(CalendarEventValidation.validateTimeRange(720, 720))
        assertFalse(CalendarEventValidation.validateTimeRange(1439, 1439))
    }

    @Test
    fun `validateTimeRange should return false when endTime is less than startTime`() {
        assertFalse(CalendarEventValidation.validateTimeRange(1, 0))
        assertFalse(CalendarEventValidation.validateTimeRange(1020, 480))
        assertFalse(CalendarEventValidation.validateTimeRange(1439, 0))
    }

    // --- validateRequiredFields ---

    @Test
    fun `validateRequiredFields should return valid when all fields are present`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
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
    fun `validateRequiredFields should return error for blank day`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            day = "",
            startTime = 480,
            endTime = 1020,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals("calendarEvent.validation.day.required", result.errors["day"])
    }

    @Test
    fun `validateRequiredFields should return error for startTime below 0`() {
        val event = CalendarEvent(
            id = "test-id",
            eventType = "shift",
            eventTypeId = "type-id",
            day = "2024-01-15",
            startTime = -1,
            endTime = 1020,
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
            day = "2024-01-15",
            startTime = 1440,
            endTime = 1020,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1440,
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
            day = "",
            startTime = -1,
            endTime = 1440,
            notes = null,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        val result = CalendarEventValidation.validateRequiredFields(event)
        assertFalse(result.isValid)
        assertEquals(5, result.errors.size)
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
    fun `validateNotes should return true when notes is exactly 200 characters`() {
        val notes = "A".repeat(200)
        assertTrue(CalendarEventValidation.validateNotes(notes))
    }

    @Test
    fun `validateNotes should return false when notes exceeds 200 characters`() {
        val notes = "A".repeat(201)
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
                day = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            day = "2024-01-15",
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
                day = "2024-01-15",
                startTime = 480,
                endTime = 540,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            day = "2024-01-15",
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
                day = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            day = "2024-01-15",
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
                day = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            day = "2024-01-15",
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
                day = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = true,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            day = "2024-01-15",
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
                day = "2024-01-15",
                startTime = 480,
                endTime = 1020,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
            CalendarEvent(
                id = "existing-2",
                eventType = "shift",
                eventTypeId = "shift-type-2",
                day = "2024-01-15",
                startTime = 1080,
                endTime = 1200,
                notes = null,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )
        val result = CalendarEventValidation.checkOneShiftPerDay(
            day = "2024-01-15",
            eventType = "shift",
            existingEvents = existingEvents,
            excludeEventId = "existing-1",
        )
        assertFalse(result)
    }
}
