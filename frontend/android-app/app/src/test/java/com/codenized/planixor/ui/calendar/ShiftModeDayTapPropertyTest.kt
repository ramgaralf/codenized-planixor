package com.codenized.planixor.ui.calendar

import com.codenized.planixor.domain.model.CalendarEventDisplay
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Property-based tests for Shift Mode day-tap routing and Day_Action_Modal rendering.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh35-shift-mode, Properties 3–6
 *
 * **Validates: Requirements 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2**
 *
 * These tests validate the pure logic of the day-tap routing decision
 * and modal data construction, mirroring CalendarViewModel.onShiftModeDayTap():
 * - Property 3: Empty day + prerequisites met → open form
 * - Property 4: Empty day + prerequisites NOT met → show prerequisite modal
 * - Property 5: Day with content → show Day_Action_Modal
 * - Property 6: Day_Action_Modal ordering (shifts alphabetically, reminders alphabetically)
 */
@OptIn(ExperimentalKotest::class)
class ShiftModeDayTapPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Generators ---

    /**
     * Generates a valid LocalDate within a reasonable range (2020-01-01 to 2030-12-31).
     */
    private val localDateArb: Arb<LocalDate> = Arb.int(
        min = LocalDate.of(2020, 1, 1).toEpochDay().toInt(),
        max = LocalDate.of(2030, 12, 31).toEpochDay().toInt(),
    ).map { epochDay -> LocalDate.ofEpochDay(epochDay.toLong()) }

    /**
     * Generates a random shift name (1-50 characters, alphanumeric for sorting tests).
     */
    private val shiftNameArb: Arb<String> = Arb.string(minSize = 1, maxSize = 50)

    /**
     * Generates a random reminder name (1-50 characters).
     */
    private val reminderNameArb: Arb<String> = Arb.string(minSize = 1, maxSize = 50)

    /**
     * Generates a random time value in minutes (0-1439).
     */
    private val timeMinutesArb: Arb<Int> = Arb.int(0, 1439)

    /**
     * Generates a random hex color string.
     */
    private val hexColorArb: Arb<String> = Arb.int(0, 0xFFFFFF).map { "#${it.toString(16).padStart(6, '0')}" }

    // --- Helper types mirroring ViewModel logic ---

    /**
     * Represents the result of the day-tap routing decision.
     */
    private sealed class DayTapAction {
        data class OpenForm(val date: LocalDate) : DayTapAction()
        data object ShowPrerequisiteDialog : DayTapAction()
        data class ShowDayActionModal(val data: DayActionModalData) : DayTapAction()
    }

    /**
     * Represents a calendar event entity stored locally (simplified for testing).
     */
    private data class CalendarEventEntity(
        val id: String,
        val eventType: String,
        val eventTypeId: String,
        val startDay: String,
        val endDay: String,
        val startTime: Int,
        val endTime: Int,
        val totalHours: Int,
        val isDeleted: Boolean,
        val name: String,
        val icon: String,
        val backgroundColor: String,
    )

    /**
     * Mirrors the core routing logic from CalendarViewModel.onShiftModeDayTap().
     * This is a pure function that determines the action based on:
     * - Events for the day (non-deleted shift/reminder events)
     * - Active shift/reminder counts (prerequisite check)
     */
    private fun computeDayTapAction(
        date: LocalDate,
        eventsForDay: List<CalendarEventEntity>,
        activeShiftCount: Int,
        activeReminderCount: Int,
    ): DayTapAction {
        // Filter for non-deleted events referencing a shift or reminder
        val shiftReminderEvents = eventsForDay.filter { event ->
            !event.isDeleted && (event.eventType == "shift" || event.eventType == "reminder")
        }

        return if (shiftReminderEvents.isEmpty()) {
            // Empty day: run prerequisite check
            val prerequisiteResult = CalendarViewModel.checkPrerequisites(activeShiftCount, activeReminderCount)
            if (prerequisiteResult.canCreate) {
                DayTapAction.OpenForm(date)
            } else {
                DayTapAction.ShowPrerequisiteDialog
            }
        } else {
            // Day with content: build Day_Action_Modal data
            val displayEvents = shiftReminderEvents.map { entity ->
                CalendarEventDisplay(
                    id = entity.id,
                    eventType = entity.eventType,
                    eventTypeId = entity.eventTypeId,
                    startDay = entity.startDay,
                    endDay = entity.endDay,
                    startTime = entity.startTime,
                    endTime = entity.endTime,
                    totalHours = entity.totalHours,
                    notes = null,
                    modifiedAt = System.currentTimeMillis(),
                    syncedAt = null,
                    isDeleted = false,
                    name = entity.name,
                    icon = entity.icon,
                    backgroundColor = entity.backgroundColor,
                )
            }

            val shiftEvents = displayEvents
                .filter { it.eventType == "shift" }
                .sortedBy { it.name.lowercase() }

            val reminderEvents = displayEvents
                .filter { it.eventType == "reminder" }
                .sortedBy { it.name.lowercase() }

            DayTapAction.ShowDayActionModal(
                DayActionModalData(
                    date = date,
                    shiftEvents = shiftEvents,
                    reminderEvents = reminderEvents,
                ),
            )
        }
    }

    // --- Property 3: Empty day tap opens form in Shift Mode ---

    /**
     * **Validates: Requirements 5.1, 7.1**
     *
     * Property 3: Empty day tap opens form in Shift Mode
     *
     * For any date with zero non-deleted shift/reminder events,
     * AND at least one active shift or reminder exists,
     * tapping that day SHALL open the Calendar_Event_Form with that date preselected.
     */
    @Test
    fun `Property 3 - empty day tap with prerequisites met opens form`() = runTest {
        checkAll(config, localDateArb, Arb.int(0, 100), Arb.int(0, 100)) { date, shiftCount, reminderCount ->
            // Ensure at least one active shift or reminder (prerequisites met)
            val effectiveShiftCount = if (shiftCount == 0 && reminderCount == 0) 1 else shiftCount
            val effectiveReminderCount = reminderCount

            val action = computeDayTapAction(
                date = date,
                eventsForDay = emptyList(), // Empty day
                activeShiftCount = effectiveShiftCount,
                activeReminderCount = effectiveReminderCount,
            )

            assertTrue(
                "Expected OpenForm for empty day with activeShifts=$effectiveShiftCount, activeReminders=$effectiveReminderCount, but got $action",
                action is DayTapAction.OpenForm,
            )
            assertEquals(
                "Expected form to open with date $date",
                date,
                (action as DayTapAction.OpenForm).date,
            )
        }
    }

    /**
     * **Validates: Requirements 5.1, 7.1**
     *
     * Property 3: Empty day tap opens form - only non-deleted events count as "content"
     *
     * For any date where ALL events are deleted (isDeleted=true),
     * the day is treated as empty and should open the form (if prerequisites met).
     */
    @Test
    fun `Property 3 - day with only deleted events is treated as empty`() = runTest {
        checkAll(config, localDateArb, Arb.int(1, 10)) { date, eventCount ->
            // Create events that are all deleted
            val deletedEvents = (1..eventCount).map { i ->
                CalendarEventEntity(
                    id = "event-$i",
                    eventType = if (i % 2 == 0) "shift" else "reminder",
                    eventTypeId = "type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    isDeleted = true, // All deleted
                    name = "Event $i",
                    icon = "📅",
                    backgroundColor = "#2563EB",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = deletedEvents,
                activeShiftCount = 1, // Prerequisites met
                activeReminderCount = 0,
            )

            assertTrue(
                "Expected OpenForm for day with only deleted events (count=$eventCount), but got $action",
                action is DayTapAction.OpenForm,
            )
        }
    }

    // --- Property 4: Prerequisite check failure shows modal ---

    /**
     * **Validates: Requirements 5.2, 7.2**
     *
     * Property 4: Prerequisite check failure shows modal
     *
     * For any date with zero non-deleted shift/reminder events,
     * AND zero active shifts AND zero active reminders in local storage,
     * tapping that day SHALL display the Prerequisite_Modal.
     */
    @Test
    fun `Property 4 - empty day tap with zero prerequisites shows prerequisite dialog`() = runTest {
        checkAll(config, localDateArb) { date ->
            val action = computeDayTapAction(
                date = date,
                eventsForDay = emptyList(),
                activeShiftCount = 0,
                activeReminderCount = 0,
            )

            assertTrue(
                "Expected ShowPrerequisiteDialog for empty day with 0 shifts and 0 reminders, but got $action",
                action is DayTapAction.ShowPrerequisiteDialog,
            )
        }
    }

    /**
     * **Validates: Requirements 5.2, 7.2**
     *
     * Property 4: Prerequisite check with all-deleted events AND zero prerequisites.
     *
     * If a day has events but all are deleted, AND there are no active shifts/reminders,
     * the prerequisite modal should be shown.
     */
    @Test
    fun `Property 4 - deleted events day with zero prerequisites shows prerequisite dialog`() = runTest {
        checkAll(config, localDateArb, Arb.int(1, 10)) { date, eventCount ->
            val deletedEvents = (1..eventCount).map { i ->
                CalendarEventEntity(
                    id = "event-$i",
                    eventType = "shift",
                    eventTypeId = "type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    isDeleted = true,
                    name = "Event $i",
                    icon = "🏢",
                    backgroundColor = "#2563EB",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = deletedEvents,
                activeShiftCount = 0,
                activeReminderCount = 0,
            )

            assertTrue(
                "Expected ShowPrerequisiteDialog for deleted-events day with 0 active shifts/reminders, but got $action",
                action is DayTapAction.ShowPrerequisiteDialog,
            )
        }
    }

    // --- Property 5: Day with content shows Day_Action_Modal ---

    /**
     * **Validates: Requirements 6.1, 8.1**
     *
     * Property 5: Day with content shows Day_Action_Modal
     *
     * For any date with at least one non-deleted calendar event referencing a shift
     * or reminder, tapping that day SHALL display the Day_Action_Modal.
     */
    @Test
    fun `Property 5 - day with non-deleted shift or reminder events shows modal`() = runTest {
        checkAll(config, localDateArb, Arb.int(1, 10), Arb.boolean()) { date, eventCount, isShift ->
            val events = (1..eventCount).map { i ->
                CalendarEventEntity(
                    id = "event-$i",
                    eventType = if (isShift) "shift" else "reminder",
                    eventTypeId = "type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    isDeleted = false, // Non-deleted
                    name = "Event $i",
                    icon = if (isShift) "🏢" else "⏰",
                    backgroundColor = "#2563EB",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = events,
                activeShiftCount = 5, // Doesn't matter — day has content
                activeReminderCount = 5,
            )

            assertTrue(
                "Expected ShowDayActionModal for day with $eventCount non-deleted events, but got $action",
                action is DayTapAction.ShowDayActionModal,
            )

            val modalData = (action as DayTapAction.ShowDayActionModal).data
            assertEquals(
                "Modal date should match tapped date",
                date,
                modalData.date,
            )
        }
    }

    /**
     * **Validates: Requirements 6.1, 8.1**
     *
     * Property 5: Mixed deleted and non-deleted events — modal shows for non-deleted ones.
     *
     * If a day has some deleted and some non-deleted events, the modal should show
     * only for the non-deleted ones.
     */
    @Test
    fun `Property 5 - mixed deleted and non-deleted events shows modal with non-deleted only`() = runTest {
        checkAll(
            config,
            localDateArb,
            Arb.list(Arb.boolean(), range = 2..10),
        ) { date, deletedFlags ->
            // Ensure at least one non-deleted event
            val flags = if (deletedFlags.all { it }) {
                deletedFlags.toMutableList().also { it[0] = false }
            } else {
                deletedFlags
            }

            val events = flags.mapIndexed { i, isDeleted ->
                CalendarEventEntity(
                    id = "event-$i",
                    eventType = if (i % 2 == 0) "shift" else "reminder",
                    eventTypeId = "type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    isDeleted = isDeleted,
                    name = "Event $i",
                    icon = "📅",
                    backgroundColor = "#2563EB",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = events,
                activeShiftCount = 5,
                activeReminderCount = 5,
            )

            assertTrue(
                "Expected ShowDayActionModal for day with at least one non-deleted event",
                action is DayTapAction.ShowDayActionModal,
            )

            val modalData = (action as DayTapAction.ShowDayActionModal).data
            val totalModalEvents = modalData.shiftEvents.size + modalData.reminderEvents.size
            val expectedNonDeleted = flags.count { !it }

            assertEquals(
                "Modal should contain exactly the non-deleted events",
                expectedNonDeleted,
                totalModalEvents,
            )
        }
    }

    // --- Property 6: Day_Action_Modal ordering ---

    /**
     * **Validates: Requirements 6.2, 8.2**
     *
     * Property 6: Day_Action_Modal ordering
     *
     * For any set of shift-type and reminder-type events on a given day,
     * the Day_Action_Modal SHALL display:
     * (1) shift cards ordered alphabetically by shift name (case-insensitive)
     * (2) reminder cards ordered alphabetically by reminder name (case-insensitive)
     */
    @Test
    fun `Property 6 - shifts are sorted alphabetically by name (case-insensitive)`() = runTest {
        checkAll(config, localDateArb, Arb.list(shiftNameArb, range = 2..15)) { date, names ->
            val events = names.mapIndexed { i, name ->
                CalendarEventEntity(
                    id = "shift-$i",
                    eventType = "shift",
                    eventTypeId = "shift-type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480 + i,
                    endTime = 960 + i,
                    totalHours = 480,
                    isDeleted = false,
                    name = name,
                    icon = "🏢",
                    backgroundColor = "#2563EB",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = events,
                activeShiftCount = 5,
                activeReminderCount = 5,
            )

            assertTrue(action is DayTapAction.ShowDayActionModal)
            val modalData = (action as DayTapAction.ShowDayActionModal).data

            // Verify shifts are sorted alphabetically (case-insensitive)
            val shiftNames = modalData.shiftEvents.map { it.name }
            val expectedSorted = names.sortedBy { it.lowercase() }

            assertEquals(
                "Shift events should be sorted alphabetically (case-insensitive)",
                expectedSorted,
                shiftNames,
            )
        }
    }

    /**
     * **Validates: Requirements 6.2, 8.2**
     *
     * Property 6: Reminders are sorted alphabetically by name (case-insensitive).
     */
    @Test
    fun `Property 6 - reminders are sorted alphabetically by name (case-insensitive)`() = runTest {
        checkAll(config, localDateArb, Arb.list(reminderNameArb, range = 2..15)) { date, names ->
            val events = names.mapIndexed { i, name ->
                CalendarEventEntity(
                    id = "reminder-$i",
                    eventType = "reminder",
                    eventTypeId = "reminder-type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480 + i,
                    endTime = 960 + i,
                    totalHours = 480,
                    isDeleted = false,
                    name = name,
                    icon = "⏰",
                    backgroundColor = "#10B981",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = events,
                activeShiftCount = 5,
                activeReminderCount = 5,
            )

            assertTrue(action is DayTapAction.ShowDayActionModal)
            val modalData = (action as DayTapAction.ShowDayActionModal).data

            // Verify reminders are sorted alphabetically (case-insensitive)
            val reminderNames = modalData.reminderEvents.map { it.name }
            val expectedSorted = names.sortedBy { it.lowercase() }

            assertEquals(
                "Reminder events should be sorted alphabetically (case-insensitive)",
                expectedSorted,
                reminderNames,
            )
        }
    }

    /**
     * **Validates: Requirements 6.2, 8.2**
     *
     * Property 6: Mixed shifts and reminders — shifts come first, then reminders,
     * each group sorted alphabetically by name.
     */
    @Test
    fun `Property 6 - modal shows shifts before reminders, each sorted alphabetically`() = runTest {
        checkAll(
            config,
            localDateArb,
            Arb.list(shiftNameArb, range = 1..8),
            Arb.list(reminderNameArb, range = 1..8),
        ) { date, shiftNames, reminderNames ->
            val shiftEvents = shiftNames.mapIndexed { i, name ->
                CalendarEventEntity(
                    id = "shift-$i",
                    eventType = "shift",
                    eventTypeId = "shift-type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480 + i,
                    endTime = 960 + i,
                    totalHours = 480,
                    isDeleted = false,
                    name = name,
                    icon = "🏢",
                    backgroundColor = "#2563EB",
                )
            }

            val reminderEvents = reminderNames.mapIndexed { i, name ->
                CalendarEventEntity(
                    id = "reminder-$i",
                    eventType = "reminder",
                    eventTypeId = "reminder-type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480 + i,
                    endTime = 960 + i,
                    totalHours = 480,
                    isDeleted = false,
                    name = name,
                    icon = "⏰",
                    backgroundColor = "#10B981",
                )
            }

            // Combine and shuffle to simulate unordered input
            val allEvents = (shiftEvents + reminderEvents).shuffled()

            val action = computeDayTapAction(
                date = date,
                eventsForDay = allEvents,
                activeShiftCount = 5,
                activeReminderCount = 5,
            )

            assertTrue(action is DayTapAction.ShowDayActionModal)
            val modalData = (action as DayTapAction.ShowDayActionModal).data

            // Verify shifts come first and are sorted alphabetically
            assertEquals(
                "Shift count should match input",
                shiftNames.size,
                modalData.shiftEvents.size,
            )
            assertEquals(
                "Shifts should be sorted alphabetically (case-insensitive)",
                shiftNames.sortedBy { it.lowercase() },
                modalData.shiftEvents.map { it.name },
            )

            // Verify reminders come second and are sorted alphabetically
            assertEquals(
                "Reminder count should match input",
                reminderNames.size,
                modalData.reminderEvents.size,
            )
            assertEquals(
                "Reminders should be sorted alphabetically (case-insensitive)",
                reminderNames.sortedBy { it.lowercase() },
                modalData.reminderEvents.map { it.name },
            )
        }
    }

    /**
     * **Validates: Requirements 6.2, 8.2**
     *
     * Property 6: Day with only shifts — no reminder section.
     */
    @Test
    fun `Property 6 - day with only shifts shows shift cards, empty reminders`() = runTest {
        checkAll(config, localDateArb, Arb.list(shiftNameArb, range = 1..10)) { date, names ->
            val events = names.mapIndexed { i, name ->
                CalendarEventEntity(
                    id = "shift-$i",
                    eventType = "shift",
                    eventTypeId = "shift-type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    isDeleted = false,
                    name = name,
                    icon = "🏢",
                    backgroundColor = "#2563EB",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = events,
                activeShiftCount = 5,
                activeReminderCount = 5,
            )

            assertTrue(action is DayTapAction.ShowDayActionModal)
            val modalData = (action as DayTapAction.ShowDayActionModal).data

            assertEquals("Should have shift events", names.size, modalData.shiftEvents.size)
            assertTrue("Reminders should be empty", modalData.reminderEvents.isEmpty())
        }
    }

    /**
     * **Validates: Requirements 6.2, 8.2**
     *
     * Property 6: Day with only reminders — no shift section.
     */
    @Test
    fun `Property 6 - day with only reminders shows reminder cards, empty shifts`() = runTest {
        checkAll(config, localDateArb, Arb.list(reminderNameArb, range = 1..10)) { date, names ->
            val events = names.mapIndexed { i, name ->
                CalendarEventEntity(
                    id = "reminder-$i",
                    eventType = "reminder",
                    eventTypeId = "reminder-type-$i",
                    startDay = date.toString(),
                    endDay = date.toString(),
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    isDeleted = false,
                    name = name,
                    icon = "⏰",
                    backgroundColor = "#10B981",
                )
            }

            val action = computeDayTapAction(
                date = date,
                eventsForDay = events,
                activeShiftCount = 5,
                activeReminderCount = 5,
            )

            assertTrue(action is DayTapAction.ShowDayActionModal)
            val modalData = (action as DayTapAction.ShowDayActionModal).data

            assertTrue("Shifts should be empty", modalData.shiftEvents.isEmpty())
            assertEquals("Should have reminder events", names.size, modalData.reminderEvents.size)
        }
    }
}
