package com.codenized.planixor.domain.validation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ShiftValidatorTest {

    // --- Name validation ---

    @Test
    fun `validateName should return null for valid name`() {
        assertNull(ShiftValidator.validateName("Morning Shift"))
    }

    @Test
    fun `validateName should return null for name with 1 character`() {
        assertNull(ShiftValidator.validateName("A"))
    }

    @Test
    fun `validateName should return null for name with exactly 50 characters`() {
        val name = "A".repeat(50)
        assertNull(ShiftValidator.validateName(name))
    }

    @Test
    fun `validateName should return error for null name`() {
        assertEquals("shift.validation.name.required", ShiftValidator.validateName(null))
    }

    @Test
    fun `validateName should return error for empty name`() {
        assertEquals("shift.validation.name.required", ShiftValidator.validateName(""))
    }

    @Test
    fun `validateName should return error for whitespace-only name`() {
        assertEquals("shift.validation.name.required", ShiftValidator.validateName("   "))
    }

    @Test
    fun `validateName should return maxLength error for name exceeding 50 chars after trim`() {
        val name = "A".repeat(51)
        assertEquals("shift.validation.name.maxLength", ShiftValidator.validateName(name))
    }

    @Test
    fun `validateName should trim before checking length`() {
        val name = "  ${"A".repeat(50)}  "
        assertNull(ShiftValidator.validateName(name))
    }

    // --- Icon validation ---

    @Test
    fun `validateIcon should return null for single emoji`() {
        assertNull(ShiftValidator.validateIcon("😀"))
    }

    @Test
    fun `validateIcon should return null for emoji with variation selector`() {
        assertNull(ShiftValidator.validateIcon("☀️"))
    }

    @Test
    fun `validateIcon should return error for null icon`() {
        assertEquals("shift.validation.icon.required", ShiftValidator.validateIcon(null))
    }

    @Test
    fun `validateIcon should return error for empty icon`() {
        assertEquals("shift.validation.icon.required", ShiftValidator.validateIcon(""))
    }

    @Test
    fun `validateIcon should return error for regular text character`() {
        assertEquals("shift.validation.icon.required", ShiftValidator.validateIcon("A"))
    }

    @Test
    fun `validateIcon should return error for multiple emojis`() {
        assertEquals("shift.validation.icon.required", ShiftValidator.validateIcon("😀😃"))
    }

    // --- Color validation ---

    @Test
    fun `validateColor should return null for valid palette color`() {
        assertNull(ShiftValidator.validateColor("#EF4444"))
    }

    @Test
    fun `validateColor should return null for all palette colors`() {
        val palette = listOf(
            "#EF4444", "#F97316", "#F59E0B", "#10B981", "#0B86D4",
            "#2563EB", "#7C3AED", "#EC4899", "#6B7280", "#1F2937",
        )
        palette.forEach { color ->
            assertNull(ShiftValidator.validateColor(color))
        }
    }

    @Test
    fun `validateColor should return error for null color`() {
        assertEquals("shift.validation.color.required", ShiftValidator.validateColor(null))
    }

    @Test
    fun `validateColor should return error for color not in palette`() {
        assertEquals("shift.validation.color.required", ShiftValidator.validateColor("#FF0000"))
    }

    @Test
    fun `validateColor should be case sensitive`() {
        assertEquals("shift.validation.color.required", ShiftValidator.validateColor("#ef4444"))
    }

    // --- Start time validation ---

    @Test
    fun `validateStartTime should return null for valid time`() {
        assertNull(ShiftValidator.validateStartTime(8, 30))
    }

    @Test
    fun `validateStartTime should return null for midnight`() {
        assertNull(ShiftValidator.validateStartTime(0, 0))
    }

    @Test
    fun `validateStartTime should return null for end of day`() {
        assertNull(ShiftValidator.validateStartTime(23, 59))
    }

    @Test
    fun `validateStartTime should return error for null hours`() {
        assertEquals("shift.validation.startTime.required", ShiftValidator.validateStartTime(null, 30))
    }

    @Test
    fun `validateStartTime should return error for null minutes`() {
        assertEquals("shift.validation.startTime.required", ShiftValidator.validateStartTime(8, null))
    }

    @Test
    fun `validateStartTime should return error for hours above 23`() {
        assertEquals("shift.validation.startTime.required", ShiftValidator.validateStartTime(24, 0))
    }

    @Test
    fun `validateStartTime should return error for negative hours`() {
        assertEquals("shift.validation.startTime.required", ShiftValidator.validateStartTime(-1, 0))
    }

    @Test
    fun `validateStartTime should return error for minutes above 59`() {
        assertEquals("shift.validation.startTime.required", ShiftValidator.validateStartTime(8, 60))
    }

    @Test
    fun `validateStartTime should return error for negative minutes`() {
        assertEquals("shift.validation.startTime.required", ShiftValidator.validateStartTime(8, -1))
    }

    // --- End time validation ---

    @Test
    fun `validateEndTime should return null for valid time`() {
        assertNull(ShiftValidator.validateEndTime(17, 0))
    }

    @Test
    fun `validateEndTime should return error for null hours`() {
        assertEquals("shift.validation.endTime.required", ShiftValidator.validateEndTime(null, 0))
    }

    @Test
    fun `validateEndTime should return error for hours above 23`() {
        assertEquals("shift.validation.endTime.required", ShiftValidator.validateEndTime(24, 0))
    }

    // --- Hours worked validation ---

    @Test
    fun `validateHoursWorked should return null for 1 minute`() {
        assertNull(ShiftValidator.validateHoursWorked(1))
    }

    @Test
    fun `validateHoursWorked should return null for 1440 minutes`() {
        assertNull(ShiftValidator.validateHoursWorked(1440))
    }

    @Test
    fun `validateHoursWorked should return null for typical value`() {
        assertNull(ShiftValidator.validateHoursWorked(480))
    }

    @Test
    fun `validateHoursWorked should return error for null`() {
        assertEquals("shift.validation.hoursWorked.range", ShiftValidator.validateHoursWorked(null))
    }

    @Test
    fun `validateHoursWorked should return null for 0 minutes`() {
        assertNull(ShiftValidator.validateHoursWorked(0))
    }

    @Test
    fun `validateHoursWorked should return error for negative value`() {
        assertEquals("shift.validation.hoursWorked.range", ShiftValidator.validateHoursWorked(-1))
    }

    @Test
    fun `validateHoursWorked should return error for value above 1440`() {
        assertEquals("shift.validation.hoursWorked.range", ShiftValidator.validateHoursWorked(1441))
    }

    // --- Full validation ---

    @Test
    fun `validate should return empty errors for all valid input`() {
        val input = ShiftValidationInput(
            name = "Morning Shift",
            icon = "☀️",
            color = "#F59E0B",
            startTimeHours = 8,
            startTimeMinutes = 0,
            endTimeHours = 16,
            endTimeMinutes = 0,
            hoursWorked = 480,
        )
        val result = ShiftValidator.validate(input)
        assertTrue(result.isValid)
        assertTrue(result.errors.isEmpty())
    }

    @Test
    fun `validate should return multiple errors for all invalid input`() {
        val input = ShiftValidationInput(
            name = null,
            icon = null,
            color = null,
            startTimeHours = null,
            startTimeMinutes = null,
            endTimeHours = null,
            endTimeMinutes = null,
            hoursWorked = null,
        )
        val result = ShiftValidator.validate(input)
        assertFalse(result.isValid)
        assertEquals(6, result.errors.size)
        assertEquals("shift.validation.name.required", result.errors["name"])
        assertEquals("shift.validation.icon.required", result.errors["icon"])
        assertEquals("shift.validation.color.required", result.errors["color"])
        assertEquals("shift.validation.startTime.required", result.errors["startTime"])
        assertEquals("shift.validation.endTime.required", result.errors["endTime"])
        assertEquals("shift.validation.hoursWorked.range", result.errors["hoursWorked"])
    }

    @Test
    fun `validate should return only errors for invalid fields`() {
        val input = ShiftValidationInput(
            name = "Valid Name",
            icon = "😀",
            color = "#EF4444",
            startTimeHours = 8,
            startTimeMinutes = 0,
            endTimeHours = 24, // invalid
            endTimeMinutes = 0,
            hoursWorked = -1, // invalid
        )
        val result = ShiftValidator.validate(input)
        assertFalse(result.isValid)
        assertEquals(2, result.errors.size)
        assertEquals("shift.validation.endTime.required", result.errors["endTime"])
        assertEquals("shift.validation.hoursWorked.range", result.errors["hoursWorked"])
    }
}
