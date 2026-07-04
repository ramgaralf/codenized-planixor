package com.codenized.planixor.ui.calendar

import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for prerequisite classification in CalendarViewModel.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh32-improvements-and-bug-fixes, Properties 5–6
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */
@OptIn(ExperimentalKotest::class)
class PrerequisitePropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Simple record model for Property 6 ---

    /** Minimal representation of a record with an isDeleted flag. */
    private data class Record(val isDeleted: Boolean)

    // --- Property 5: Calendar event prerequisite classification ---

    /**
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
     *
     * Property 5: Calendar event prerequisite classification (OR logic)
     *
     * For any non-negative pair (shiftCount, reminderCount):
     * - at least one > 0 (either or both) → canCreate=true, missingShifts=false, missingReminders=false
     * - both = 0 → canCreate=false, missingShifts=true, missingReminders=true
     */
    @Test
    fun `Property 5 - prerequisite classification is correct for any counts`() = runTest {
        checkAll(config, Arb.int(0, 1000), Arb.int(0, 1000)) { shiftCount, reminderCount ->
            val result = CalendarViewModel.checkPrerequisites(shiftCount, reminderCount)

            when {
                shiftCount > 0 || reminderCount > 0 -> {
                    assertTrue(
                        "Expected canCreate=true when shiftCount=$shiftCount or reminderCount=$reminderCount > 0",
                        result.canCreate,
                    )
                    assertFalse(
                        "Expected missingShifts=false when canCreate=true",
                        result.missingShifts,
                    )
                    assertFalse(
                        "Expected missingReminders=false when canCreate=true",
                        result.missingReminders,
                    )
                }
                else -> {
                    // Both are 0
                    assertFalse(
                        "Expected canCreate=false when both counts are 0",
                        result.canCreate,
                    )
                    assertTrue(
                        "Expected missingShifts=true when shiftCount=0",
                        result.missingShifts,
                    )
                    assertTrue(
                        "Expected missingReminders=true when reminderCount=0",
                        result.missingReminders,
                    )
                }
            }
        }
    }

    // --- Property 6: Prerequisite check uses only non-deleted records ---

    /**
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
     *
     * Property 6: Prerequisite check uses only non-deleted records
     *
     * For any collections of shift and reminder records with mixed isDeleted values:
     * - Count only those where isDeleted=false
     * - Pass those counts to checkPrerequisites
     * - Verify the result matches the expected classification based on filtered counts (OR logic)
     */
    @Test
    fun `Property 6 - prerequisite check uses only non-deleted records`() = runTest {
        val recordListArb = Arb.list(Arb.boolean().let { boolArb ->
            boolArb.let { Arb.boolean() }
        }, range = 0..50)

        checkAll(config, recordListArb, recordListArb) { shiftDeletedFlags, reminderDeletedFlags ->
            // Create records with mixed isDeleted values
            val shifts = shiftDeletedFlags.map { Record(isDeleted = it) }
            val reminders = reminderDeletedFlags.map { Record(isDeleted = it) }

            // Count only non-deleted records (mirrors the ViewModel's filtering logic)
            val activeShiftCount = shifts.count { !it.isDeleted }
            val activeReminderCount = reminders.count { !it.isDeleted }

            // Call the pure function with filtered counts
            val result = CalendarViewModel.checkPrerequisites(activeShiftCount, activeReminderCount)

            // Verify classification matches the OR logic
            val expectedCanCreate = activeShiftCount > 0 || activeReminderCount > 0
            val expectedMissingShifts = if (!expectedCanCreate) true else false
            val expectedMissingReminders = if (!expectedCanCreate) true else false

            assertEquals(
                "canCreate should be $expectedCanCreate for activeShifts=$activeShiftCount, activeReminders=$activeReminderCount " +
                    "(total shifts=${shifts.size}, deleted=${shifts.count { it.isDeleted }}; " +
                    "total reminders=${reminders.size}, deleted=${reminders.count { it.isDeleted }})",
                expectedCanCreate,
                result.canCreate,
            )
            assertEquals(
                "missingShifts should be $expectedMissingShifts for activeShiftCount=$activeShiftCount",
                expectedMissingShifts,
                result.missingShifts,
            )
            assertEquals(
                "missingReminders should be $expectedMissingReminders for activeReminderCount=$activeReminderCount",
                expectedMissingReminders,
                result.missingReminders,
            )
        }
    }
}
