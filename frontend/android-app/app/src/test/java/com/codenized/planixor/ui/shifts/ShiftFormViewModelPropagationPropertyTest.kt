package com.codenized.planixor.ui.shifts

import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.domain.validation.CalendarEventValidation
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.arbitrary
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.Year
import java.util.UUID

/**
 * Property-based tests for Android propagation logic.
 * Tests the filtering and update patterns used by ShiftFormViewModel and ReminderFormViewModel.
 *
 * Since propagation logic is embedded in ViewModels and requires the DAO,
 * these tests extract and verify the pure filtering/update logic as functions
 * that mirror the ViewModel implementations.
 *
 * Feature: gh18-calendar-shift-reminder-improvements
 *
 * Uses Kotest property testing with JUnit 4.
 * Minimum 100 iterations per property.
 */
@OptIn(ExperimentalKotest::class)
class ShiftFormViewModelPropagationPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Propagation Logic (mirrors ViewModel implementations) ---

    /**
     * Filters events that should be affected by shift propagation.
     * Mirrors the filtering logic in ShiftFormViewModel.confirmPropagation().
     */
    private fun filterAffectedShiftEvents(
        allEvents: List<CalendarEventEntity>,
        shiftId: String,
        currentYear: Int,
    ): List<CalendarEventEntity> {
        val startOfYear = "$currentYear-01-01"
        val endOfYear = "$currentYear-12-31"

        return allEvents.filter { event ->
            !event.isDeleted &&
                event.eventType == "shift" &&
                event.eventTypeId == shiftId &&
                event.startDay >= startOfYear &&
                event.startDay <= endOfYear
        }
    }

    /**
     * Filters events that should be affected by reminder propagation.
     * Mirrors the filtering logic in ReminderFormViewModel (same pattern as shift but eventType="reminder").
     */
    private fun filterAffectedReminderEvents(
        allEvents: List<CalendarEventEntity>,
        reminderId: String,
        currentYear: Int,
    ): List<CalendarEventEntity> {
        val startOfYear = "$currentYear-01-01"
        val endOfYear = "$currentYear-12-31"

        return allEvents.filter { event ->
            !event.isDeleted &&
                event.eventType == "reminder" &&
                event.eventTypeId == reminderId &&
                event.startDay >= startOfYear &&
                event.startDay <= endOfYear
        }
    }

    /**
     * Applies shift propagation updates to an event.
     * Mirrors the update logic in ShiftFormViewModel.confirmPropagation().
     */
    private fun applyShiftPropagation(
        event: CalendarEventEntity,
        startTime: Int,
        endTime: Int,
        hoursWorked: Int,
        now: Long,
    ): CalendarEventEntity {
        val newEndDay = CalendarEventValidation.computeEndDayForShift(
            event.startDay,
            startTime,
            endTime,
        )
        return event.copy(
            startTime = startTime,
            endTime = endTime,
            totalHours = hoursWorked,
            endDay = newEndDay,
            modifiedAt = now,
            syncedAt = null,
        )
    }

    /**
     * Applies reminder propagation updates to an event.
     * Only modifiedAt and syncedAt are touched.
     */
    private fun applyReminderPropagation(
        event: CalendarEventEntity,
        now: Long,
    ): CalendarEventEntity {
        return event.copy(
            modifiedAt = now,
            syncedAt = null,
        )
    }

    // --- Generators ---

    private val currentYear = Year.now().value

    /** Generates a date string in the current year. */
    private val currentYearDateArb: Arb<String> = Arb.int(1, 365).map { dayOfYear ->
        val date = LocalDate.ofYearDay(currentYear, dayOfYear.coerceAtMost(
            if (Year.of(currentYear).isLeap) 366 else 365
        ))
        date.toString()
    }

    /** Generates a date string in the previous year. */
    private val previousYearDateArb: Arb<String> = Arb.int(1, 365).map { dayOfYear ->
        val prevYear = currentYear - 1
        val date = LocalDate.ofYearDay(prevYear, dayOfYear.coerceAtMost(
            if (Year.of(prevYear).isLeap) 366 else 365
        ))
        date.toString()
    }

    /** Generates a date string in the next year. */
    private val nextYearDateArb: Arb<String> = Arb.int(1, 365).map { dayOfYear ->
        val nextYear = currentYear + 1
        val date = LocalDate.ofYearDay(nextYear, dayOfYear.coerceAtMost(
            if (Year.of(nextYear).isLeap) 366 else 365
        ))
        date.toString()
    }

    /** Generates a valid time value in minutes (0-1439). */
    private val validTimeArb: Arb<Int> = Arb.int(0, 1439)

    /** Generates a valid hoursWorked value (0-1440). */
    private val validHoursWorkedArb: Arb<Int> = Arb.int(0, 1440)

    /** Generates a CalendarEventEntity for shift type in the current year. */
    private fun shiftEventArb(shiftId: String): Arb<CalendarEventEntity> = arbitrary {
        val startDay = currentYearDateArb.bind()
        val startTime = validTimeArb.bind()
        val endTime = validTimeArb.bind()
        val hoursWorked = validHoursWorkedArb.bind()
        val endDay = CalendarEventValidation.computeEndDayForShift(startDay, startTime, endTime)
        CalendarEventEntity(
            id = UUID.randomUUID().toString(),
            eventType = "shift",
            eventTypeId = shiftId,
            startDay = startDay,
            endDay = endDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = hoursWorked,
            notes = null,
            modifiedAt = 1000L,
            syncedAt = 500L,
            isDeleted = false,
        )
    }

    /** Generates a CalendarEventEntity for shift type in the previous year. */
    private fun shiftEventPrevYearArb(shiftId: String): Arb<CalendarEventEntity> = arbitrary {
        val startDay = previousYearDateArb.bind()
        val startTime = validTimeArb.bind()
        val endTime = validTimeArb.bind()
        val hoursWorked = validHoursWorkedArb.bind()
        val endDay = CalendarEventValidation.computeEndDayForShift(startDay, startTime, endTime)
        CalendarEventEntity(
            id = UUID.randomUUID().toString(),
            eventType = "shift",
            eventTypeId = shiftId,
            startDay = startDay,
            endDay = endDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = hoursWorked,
            notes = null,
            modifiedAt = 1000L,
            syncedAt = 500L,
            isDeleted = false,
        )
    }

    /** Generates a CalendarEventEntity for reminder type in the current year. */
    private fun reminderEventArb(reminderId: String): Arb<CalendarEventEntity> = arbitrary {
        val startDay = currentYearDateArb.bind()
        val startTime = validTimeArb.bind()
        val endTime = validTimeArb.bind()
        CalendarEventEntity(
            id = UUID.randomUUID().toString(),
            eventType = "reminder",
            eventTypeId = reminderId,
            startDay = startDay,
            endDay = startDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = if (endTime >= startTime) endTime - startTime else 0,
            notes = "Some note",
            modifiedAt = 2000L,
            syncedAt = 1500L,
            isDeleted = false,
        )
    }

    /** Generates a CalendarEventEntity for reminder type in the previous year. */
    private fun reminderEventPrevYearArb(reminderId: String): Arb<CalendarEventEntity> = arbitrary {
        val startDay = previousYearDateArb.bind()
        val startTime = validTimeArb.bind()
        val endTime = validTimeArb.bind()
        CalendarEventEntity(
            id = UUID.randomUUID().toString(),
            eventType = "reminder",
            eventTypeId = reminderId,
            startDay = startDay,
            endDay = startDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = if (endTime >= startTime) endTime - startTime else 0,
            notes = null,
            modifiedAt = 2000L,
            syncedAt = 1500L,
            isDeleted = false,
        )
    }

    // --- Property 4: Propagation only affects current-year events ---

    /**
     * Feature: gh18-calendar-shift-reminder-improvements, Property 4: Propagation only affects current-year events
     *
     * **Validates: Requirements 6.3, 6.6, 7.3, 7.6**
     *
     * For any set of calendar events with various startDays (some current year, some previous years):
     * After propagation filtering, only events in the current year should be affected.
     */
    @Test
    fun `Property 4 - shift propagation only filters current-year events`() = runTest {
        val shiftId = "test-shift-id"

        val mixedEventsArb = arbitrary {
            val currentYearEvents = Arb.list(shiftEventArb(shiftId), 0..5).bind()
            val prevYearEvents = Arb.list(shiftEventPrevYearArb(shiftId), 0..5).bind()
            Pair(currentYearEvents, prevYearEvents)
        }

        checkAll(config, mixedEventsArb) { (currentYearEvents, prevYearEvents) ->
            val allEvents = currentYearEvents + prevYearEvents

            val affected = filterAffectedShiftEvents(allEvents, shiftId, currentYear)

            // All affected events must have startDay in the current year
            val startOfYear = "$currentYear-01-01"
            val endOfYear = "$currentYear-12-31"

            affected.forEach { event ->
                assertTrue(
                    "Affected event startDay (${event.startDay}) should be >= $startOfYear",
                    event.startDay >= startOfYear,
                )
                assertTrue(
                    "Affected event startDay (${event.startDay}) should be <= $endOfYear",
                    event.startDay <= endOfYear,
                )
            }

            // None of the previous year events should be in the affected set
            prevYearEvents.forEach { prevEvent ->
                assertTrue(
                    "Previous year event (${prevEvent.startDay}) should NOT be in affected set",
                    !affected.contains(prevEvent),
                )
            }

            // Count should match the current year non-deleted events
            assertEquals(
                "Affected count should match current year events",
                currentYearEvents.size,
                affected.size,
            )
        }
    }

    @Test
    fun `Property 4 - reminder propagation only filters current-year events`() = runTest {
        val reminderId = "test-reminder-id"

        val mixedEventsArb = arbitrary {
            val currentYearEvents = Arb.list(reminderEventArb(reminderId), 0..5).bind()
            val prevYearEvents = Arb.list(reminderEventPrevYearArb(reminderId), 0..5).bind()
            Pair(currentYearEvents, prevYearEvents)
        }

        checkAll(config, mixedEventsArb) { (currentYearEvents, prevYearEvents) ->
            val allEvents = currentYearEvents + prevYearEvents

            val affected = filterAffectedReminderEvents(allEvents, reminderId, currentYear)

            // All affected events must have startDay in the current year
            val startOfYear = "$currentYear-01-01"
            val endOfYear = "$currentYear-12-31"

            affected.forEach { event ->
                assertTrue(
                    "Affected reminder event startDay (${event.startDay}) should be >= $startOfYear",
                    event.startDay >= startOfYear,
                )
                assertTrue(
                    "Affected reminder event startDay (${event.startDay}) should be <= $endOfYear",
                    event.startDay <= endOfYear,
                )
            }

            // None of the previous year events should be in the affected set
            prevYearEvents.forEach { prevEvent ->
                assertTrue(
                    "Previous year reminder event (${prevEvent.startDay}) should NOT be in affected set",
                    !affected.contains(prevEvent),
                )
            }

            assertEquals(
                "Affected count should match current year reminder events",
                currentYearEvents.size,
                affected.size,
            )
        }
    }

    @Test
    fun `Property 4 - deleted events in current year are not affected`() = runTest {
        val shiftId = "test-shift-id"

        val deletedEventArb = arbitrary {
            val startDay = currentYearDateArb.bind()
            val startTime = validTimeArb.bind()
            val endTime = validTimeArb.bind()
            CalendarEventEntity(
                id = UUID.randomUUID().toString(),
                eventType = "shift",
                eventTypeId = shiftId,
                startDay = startDay,
                endDay = CalendarEventValidation.computeEndDayForShift(startDay, startTime, endTime),
                startTime = startTime,
                endTime = endTime,
                totalHours = validHoursWorkedArb.bind(),
                notes = null,
                modifiedAt = 1000L,
                syncedAt = 500L,
                isDeleted = true,
            )
        }

        checkAll(config, Arb.list(deletedEventArb, 1..5)) { deletedEvents ->
            val affected = filterAffectedShiftEvents(deletedEvents, shiftId, currentYear)

            assertTrue(
                "Deleted events should never be in affected set, but got ${affected.size}",
                affected.isEmpty(),
            )
        }
    }

    @Test
    fun `Property 4 - events with different eventTypeId are not affected`() = runTest {
        val targetShiftId = "target-shift"
        val otherShiftId = "other-shift"

        val otherShiftEventArb = arbitrary {
            val startDay = currentYearDateArb.bind()
            val startTime = validTimeArb.bind()
            val endTime = validTimeArb.bind()
            CalendarEventEntity(
                id = UUID.randomUUID().toString(),
                eventType = "shift",
                eventTypeId = otherShiftId,
                startDay = startDay,
                endDay = CalendarEventValidation.computeEndDayForShift(startDay, startTime, endTime),
                startTime = startTime,
                endTime = endTime,
                totalHours = validHoursWorkedArb.bind(),
                notes = null,
                modifiedAt = 1000L,
                syncedAt = 500L,
                isDeleted = false,
            )
        }

        checkAll(config, Arb.list(otherShiftEventArb, 1..5)) { otherEvents ->
            val affected = filterAffectedShiftEvents(otherEvents, targetShiftId, currentYear)

            assertTrue(
                "Events with different eventTypeId should not be affected",
                affected.isEmpty(),
            )
        }
    }

    // --- Property 5: Propagation updates correct fields for shifts ---

    /**
     * Feature: gh18-calendar-shift-reminder-improvements, Property 5: Propagation updates correct fields for shifts
     *
     * **Validates: Requirements 6.3, 6.6**
     *
     * For any propagation with given startTime (0-1439), endTime (0-1439), hoursWorked (0-1440):
     * Affected events should have correct startTime, endTime, totalHours, endDay (recomputed).
     * modifiedAt should be recent, syncedAt should be null.
     */
    @Test
    fun `Property 5 - propagation updates startTime endTime totalHours correctly`() = runTest {
        val shiftId = "propagate-shift"

        val testCaseArb = arbitrary {
            val event = shiftEventArb(shiftId).bind()
            val newStartTime = validTimeArb.bind()
            val newEndTime = validTimeArb.bind()
            val newHoursWorked = validHoursWorkedArb.bind()
            Triple(event, Triple(newStartTime, newEndTime, newHoursWorked), System.currentTimeMillis())
        }

        checkAll(config, testCaseArb) { (event, shiftData, now) ->
            val (newStartTime, newEndTime, newHoursWorked) = shiftData

            val updated = applyShiftPropagation(event, newStartTime, newEndTime, newHoursWorked, now)

            // Verify startTime is updated
            assertEquals(
                "startTime should be updated to $newStartTime",
                newStartTime,
                updated.startTime,
            )

            // Verify endTime is updated
            assertEquals(
                "endTime should be updated to $newEndTime",
                newEndTime,
                updated.endTime,
            )

            // Verify totalHours is updated to hoursWorked
            assertEquals(
                "totalHours should be updated to hoursWorked ($newHoursWorked)",
                newHoursWorked,
                updated.totalHours,
            )
        }
    }

    @Test
    fun `Property 5 - propagation recomputes endDay based on crossing midnight`() = runTest {
        val shiftId = "propagate-shift"

        val testCaseArb = arbitrary {
            val event = shiftEventArb(shiftId).bind()
            val newStartTime = validTimeArb.bind()
            val newEndTime = validTimeArb.bind()
            val newHoursWorked = validHoursWorkedArb.bind()
            Triple(event, Triple(newStartTime, newEndTime, newHoursWorked), System.currentTimeMillis())
        }

        checkAll(config, testCaseArb) { (event, shiftData, now) ->
            val (newStartTime, newEndTime, newHoursWorked) = shiftData

            val updated = applyShiftPropagation(event, newStartTime, newEndTime, newHoursWorked, now)

            // Verify endDay is recomputed correctly
            val expectedEndDay = CalendarEventValidation.computeEndDayForShift(
                event.startDay,
                newStartTime,
                newEndTime,
            )
            assertEquals(
                "endDay should be recomputed via computeEndDayForShift",
                expectedEndDay,
                updated.endDay,
            )

            // Verify crossing-midnight logic: endTime <= startTime → endDay = startDay + 1
            if (newEndTime <= newStartTime) {
                val expectedNextDay = LocalDate.parse(event.startDay).plusDays(1).toString()
                assertEquals(
                    "When endTime ($newEndTime) <= startTime ($newStartTime), endDay should be startDay + 1",
                    expectedNextDay,
                    updated.endDay,
                )
            } else {
                assertEquals(
                    "When endTime ($newEndTime) > startTime ($newStartTime), endDay should equal startDay",
                    event.startDay,
                    updated.endDay,
                )
            }
        }
    }

    @Test
    fun `Property 5 - propagation sets modifiedAt to now and syncedAt to null`() = runTest {
        val shiftId = "propagate-shift"

        val testCaseArb = arbitrary {
            val event = shiftEventArb(shiftId).bind()
            val newStartTime = validTimeArb.bind()
            val newEndTime = validTimeArb.bind()
            val newHoursWorked = validHoursWorkedArb.bind()
            Triple(event, Triple(newStartTime, newEndTime, newHoursWorked), System.currentTimeMillis())
        }

        checkAll(config, testCaseArb) { (event, shiftData, now) ->
            val (newStartTime, newEndTime, newHoursWorked) = shiftData

            val updated = applyShiftPropagation(event, newStartTime, newEndTime, newHoursWorked, now)

            // modifiedAt must equal the propagation timestamp
            assertEquals(
                "modifiedAt should be set to the propagation timestamp",
                now,
                updated.modifiedAt,
            )

            // syncedAt must be null (marks for sync)
            assertNull(
                "syncedAt should be null after propagation (marks for sync)",
                updated.syncedAt,
            )
        }
    }

    @Test
    fun `Property 5 - propagation preserves id, eventType, eventTypeId, startDay, notes, isDeleted`() = runTest {
        val shiftId = "propagate-shift"

        val testCaseArb = arbitrary {
            val event = shiftEventArb(shiftId).bind()
            val newStartTime = validTimeArb.bind()
            val newEndTime = validTimeArb.bind()
            val newHoursWorked = validHoursWorkedArb.bind()
            Triple(event, Triple(newStartTime, newEndTime, newHoursWorked), System.currentTimeMillis())
        }

        checkAll(config, testCaseArb) { (event, shiftData, now) ->
            val (newStartTime, newEndTime, newHoursWorked) = shiftData

            val updated = applyShiftPropagation(event, newStartTime, newEndTime, newHoursWorked, now)

            // These fields must NOT change
            assertEquals("id should be preserved", event.id, updated.id)
            assertEquals("eventType should be preserved", event.eventType, updated.eventType)
            assertEquals("eventTypeId should be preserved", event.eventTypeId, updated.eventTypeId)
            assertEquals("startDay should be preserved", event.startDay, updated.startDay)
            assertEquals("notes should be preserved", event.notes, updated.notes)
            assertEquals("isDeleted should be preserved", event.isDeleted, updated.isDeleted)
            assertEquals("alertOffsets should be preserved", event.alertOffsets, updated.alertOffsets)
        }
    }

    // --- Property 6: Propagation touches modifiedAt/syncedAt for reminders ---

    /**
     * Feature: gh18-calendar-shift-reminder-improvements, Property 6: Propagation touches modifiedAt/syncedAt for reminders
     *
     * **Validates: Requirements 7.3, 7.6**
     *
     * For reminder propagation: only modifiedAt and syncedAt change, other fields stay same.
     */
    @Test
    fun `Property 6 - reminder propagation only changes modifiedAt and syncedAt`() = runTest {
        val reminderId = "propagate-reminder"

        val testCaseArb = arbitrary {
            val event = reminderEventArb(reminderId).bind()
            Pair(event, System.currentTimeMillis())
        }

        checkAll(config, testCaseArb) { (event, now) ->
            val updated = applyReminderPropagation(event, now)

            // modifiedAt must be updated to now
            assertEquals(
                "modifiedAt should be set to propagation timestamp",
                now,
                updated.modifiedAt,
            )

            // syncedAt must be null
            assertNull(
                "syncedAt should be null after reminder propagation",
                updated.syncedAt,
            )

            // ALL other fields must remain unchanged
            assertEquals("id should be preserved", event.id, updated.id)
            assertEquals("eventType should be preserved", event.eventType, updated.eventType)
            assertEquals("eventTypeId should be preserved", event.eventTypeId, updated.eventTypeId)
            assertEquals("startDay should be preserved", event.startDay, updated.startDay)
            assertEquals("endDay should be preserved", event.endDay, updated.endDay)
            assertEquals("startTime should be preserved", event.startTime, updated.startTime)
            assertEquals("endTime should be preserved", event.endTime, updated.endTime)
            assertEquals("totalHours should be preserved", event.totalHours, updated.totalHours)
            assertEquals("notes should be preserved", event.notes, updated.notes)
            assertEquals("isDeleted should be preserved", event.isDeleted, updated.isDeleted)
            assertEquals("alertOffsets should be preserved", event.alertOffsets, updated.alertOffsets)
        }
    }

    @Test
    fun `Property 6 - reminder propagation with previously synced events clears syncedAt`() = runTest {
        val reminderId = "propagate-reminder"

        val syncedEventArb = arbitrary {
            val startDay = currentYearDateArb.bind()
            val startTime = validTimeArb.bind()
            val endTime = validTimeArb.bind()
            CalendarEventEntity(
                id = UUID.randomUUID().toString(),
                eventType = "reminder",
                eventTypeId = reminderId,
                startDay = startDay,
                endDay = startDay,
                startTime = startTime,
                endTime = endTime,
                totalHours = if (endTime >= startTime) endTime - startTime else 0,
                notes = null,
                modifiedAt = 2000L,
                syncedAt = 3000L, // Previously synced
                isDeleted = false,
            )
        }

        checkAll(config, syncedEventArb) { event ->
            val now = System.currentTimeMillis()

            // Confirm the event had a non-null syncedAt before propagation
            assertNotNull("Event should have non-null syncedAt before propagation", event.syncedAt)

            val updated = applyReminderPropagation(event, now)

            // After propagation, syncedAt must be null
            assertNull(
                "syncedAt should be null after propagation, even if previously synced",
                updated.syncedAt,
            )
        }
    }

    @Test
    fun `Property 6 - reminder propagation does not modify content fields regardless of input`() = runTest {
        val reminderId = "propagate-reminder"

        // Use events with various field values to ensure none are accidentally modified
        val variedEventArb = arbitrary {
            val startDay = currentYearDateArb.bind()
            val startTime = validTimeArb.bind()
            val endTime = validTimeArb.bind()
            val notes = Arb.of(null, "Short note", "A longer note with some content").bind()
            CalendarEventEntity(
                id = UUID.randomUUID().toString(),
                eventType = "reminder",
                eventTypeId = reminderId,
                startDay = startDay,
                endDay = startDay,
                startTime = startTime,
                endTime = endTime,
                totalHours = if (endTime >= startTime) endTime - startTime else 0,
                notes = notes,
                modifiedAt = Arb.int(1000, 100000).bind().toLong(),
                syncedAt = Arb.of(null, 500L, 1000L, 99999L).bind(),
                isDeleted = false,
                alertOffsets = Arb.of("[]", "[5]", "[5,10,15]").bind(),
            )
        }

        checkAll(config, variedEventArb) { event ->
            val now = System.currentTimeMillis()
            val updated = applyReminderPropagation(event, now)

            // Content fields must never be modified
            assertEquals("startTime unchanged", event.startTime, updated.startTime)
            assertEquals("endTime unchanged", event.endTime, updated.endTime)
            assertEquals("totalHours unchanged", event.totalHours, updated.totalHours)
            assertEquals("startDay unchanged", event.startDay, updated.startDay)
            assertEquals("endDay unchanged", event.endDay, updated.endDay)
            assertEquals("notes unchanged", event.notes, updated.notes)
            assertEquals("alertOffsets unchanged", event.alertOffsets, updated.alertOffsets)
            assertEquals("eventType unchanged", event.eventType, updated.eventType)
            assertEquals("eventTypeId unchanged", event.eventTypeId, updated.eventTypeId)
            assertEquals("id unchanged", event.id, updated.id)
            assertEquals("isDeleted unchanged", event.isDeleted, updated.isDeleted)
        }
    }
}
