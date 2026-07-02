package com.codenized.planixor.ui.reports

import app.cash.turbine.test
import com.codenized.planixor.data.local.AnnualHoursConfigRepository
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ReminderEntity
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import com.codenized.planixor.domain.model.AnnualHoursConfig
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/**
 * Integration tests for the Reports screen.
 * Tests multi-step state transitions across mode switching, date navigation,
 * config dialog interactions, and empty state logic as integrated operations.
 *
 * Validates: Requirements 11.1, 8.11, 4.1
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ReportsScreenIntegrationTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var calendarEventDao: CalendarEventDao
    private lateinit var shiftDao: ShiftDao
    private lateinit var reminderDao: ReminderDao
    private lateinit var annualHoursConfigRepository: AnnualHoursConfigRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        calendarEventDao = mockk(relaxed = true)
        shiftDao = mockk(relaxed = true)
        reminderDao = mockk(relaxed = true)
        annualHoursConfigRepository = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): ReportsViewModel {
        return ReportsViewModel(
            calendarEventDao = calendarEventDao,
            shiftDao = shiftDao,
            reminderDao = reminderDao,
            annualHoursConfigRepository = annualHoursConfigRepository,
        )
    }

    private fun createCalendarEventEntity(
        id: String = "event-1",
        eventType: String = "shift",
        eventTypeId: String = "shift-1",
        startDay: String = "2025-06-15",
        endDay: String = "2025-06-15",
        startTime: Int = 480,
        endTime: Int = 960,
        totalHours: Int = 480,
        isDeleted: Boolean = false,
    ): CalendarEventEntity = CalendarEventEntity(
        id = id,
        eventType = eventType,
        eventTypeId = eventTypeId,
        startDay = startDay,
        endDay = endDay,
        startTime = startTime,
        endTime = endTime,
        totalHours = totalHours,
        notes = null,
        modifiedAt = System.currentTimeMillis(),
        syncedAt = null,
        isDeleted = isDeleted,
    )

    private fun createShiftEntity(
        id: String = "shift-1",
        name: String = "Morning",
        icon: String = "☀️",
        backgroundColor: String = "#10B981",
    ): ShiftEntity = ShiftEntity(
        id = id,
        name = name,
        icon = icon,
        backgroundColor = backgroundColor,
        startTime = 480,
        endTime = 960,
        hoursWorked = 480,
        isActive = true,
        createdAt = 1000L,
        modifiedAt = 2000L,
        syncedAt = null,
        isDeleted = false,
    )

    private fun createReminderEntity(
        id: String = "reminder-1",
        name: String = "Exercise",
        icon: String = "🏃",
        backgroundColor: String = "#F97316",
    ): ReminderEntity = ReminderEntity(
        id = id,
        name = name,
        icon = icon,
        backgroundColor = backgroundColor,
        isActive = true,
        createdAt = 1000L,
        modifiedAt = 2000L,
        syncedAt = null,
        isDeleted = false,
    )

    private fun currentMonthDate(): String {
        val now = LocalDate.now()
        return now.withDayOfMonth(15).toString()
    }

    private fun setupEmptyEventFlow() {
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
    }

    // region Integration: State transitions (mode switch + date navigation roundtrip)

    @Test
    fun `full roundtrip - month navigation then mode switch to year and back preserves state`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()
        val initialMonth = now.monthValue - 1
        val initialYear = now.year

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // initial loaded state

            // Step 1: Navigate forward 2 months
            viewModel.navigateNext()
            advanceUntilIdle()
            awaitItem()

            viewModel.navigateNext()
            advanceUntilIdle()
            val afterNav = awaitItem()

            val expectedMonth = (initialMonth + 2) % 12
            val expectedYear = if (initialMonth + 2 >= 12) initialYear + 1 else initialYear
            assertEquals(ReportMode.MONTH, afterNav.mode)
            assertEquals(expectedMonth, afterNav.selectedMonth)
            assertEquals(expectedYear, afterNav.selectedYear)

            // Step 2: Switch to Year mode
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            val yearState = awaitItem()

            assertEquals(ReportMode.YEAR, yearState.mode)
            assertEquals(expectedYear, yearState.selectedYear)
            assertEquals(expectedMonth, yearState.previousMonth)
            assertEquals(expectedYear, yearState.previousYear)

            // Step 3: Navigate year forward
            viewModel.navigateNext()
            advanceUntilIdle()
            val yearNavState = awaitItem()
            assertEquals(expectedYear + 1, yearNavState.selectedYear)

            // Step 4: Switch back to Month mode — should restore original navigated month
            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            val restoredState = awaitItem()

            assertEquals(ReportMode.MONTH, restoredState.mode)
            assertEquals(expectedMonth, restoredState.selectedMonth)
            assertEquals(expectedYear, restoredState.selectedYear)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `mode switch to year then navigate year then today resets to current year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // loaded

            // Switch to Year mode
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            // Navigate 3 years back
            viewModel.navigatePrevious()
            advanceUntilIdle()
            awaitItem()
            viewModel.navigatePrevious()
            advanceUntilIdle()
            awaitItem()
            viewModel.navigatePrevious()
            advanceUntilIdle()
            val navigatedState = awaitItem()

            assertEquals(now.year - 3, navigatedState.selectedYear)

            // Hit Today — should reset to current year
            viewModel.navigateToday()
            advanceUntilIdle()
            val todayState = awaitItem()

            assertEquals(now.year, todayState.selectedYear)
            assertEquals(ReportMode.YEAR, todayState.mode)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `multiple mode switches preserve date context correctly`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()
        val initialMonth = now.monthValue - 1
        val initialYear = now.year

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            // First round: Month → Year → Month
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            val firstRestore = awaitItem()
            assertEquals(initialMonth, firstRestore.selectedMonth)
            assertEquals(initialYear, firstRestore.selectedYear)

            // Navigate month forward
            viewModel.navigateNext()
            advanceUntilIdle()
            awaitItem()

            val newMonth = if (initialMonth < 11) initialMonth + 1 else 0
            val newYear = if (initialMonth < 11) initialYear else initialYear + 1

            // Second round: Month → Year → Month should restore the new navigated month
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            val secondRestore = awaitItem()

            assertEquals(newMonth, secondRestore.selectedMonth)
            assertEquals(newYear, secondRestore.selectedYear)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `date navigation in month mode wraps correctly across year boundaries`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            // Navigate backward to cross a year boundary
            val monthsToJanuary = now.monthValue - 1
            repeat(monthsToJanuary) {
                viewModel.navigatePrevious()
                advanceUntilIdle()
                awaitItem()
            }

            // Now at January of current year; one more back → December previous year
            viewModel.navigatePrevious()
            advanceUntilIdle()
            val december = awaitItem()

            assertEquals(11, december.selectedMonth)
            assertEquals(now.year - 1, december.selectedYear)

            // Navigate forward back across boundary
            viewModel.navigateNext()
            advanceUntilIdle()
            val januaryAgain = awaitItem()

            assertEquals(0, januaryAgain.selectedMonth)
            assertEquals(now.year, januaryAgain.selectedYear)

            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region Integration: AnnualConfigDialog validation feedback

    @Test
    fun `config dialog open then save then data refreshes in year mode`() = runTest {
        val currentYear = LocalDate.now().year
        val configFlow = MutableStateFlow<AnnualHoursConfig?>(null)

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        every { annualHoursConfigRepository.getByYear(currentYear) } returns configFlow
        coEvery { annualHoursConfigRepository.save(currentYear, 1800) } coAnswers {
            configFlow.value = AnnualHoursConfig(
                id = "config-1",
                year = currentYear,
                configuredHours = 1800,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            )
            Result.success(Unit)
        }

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // month loaded

            // Switch to Year mode
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            val yearState = awaitItem()
            assertEquals(ReportMode.YEAR, yearState.mode)
            assertNull(yearState.reportData?.annualConfig)

            // Open config dialog
            viewModel.openConfigDialog()
            advanceUntilIdle()
            val dialogOpen = awaitItem()
            assertTrue(dialogOpen.isConfigDialogOpen)

            // Save annual config (triggers reactive update)
            viewModel.saveAnnualConfig(1800)
            advanceUntilIdle()

            // Consume state emissions until dialog is closed and config is reflected
            var finalState = awaitItem()
            // There may be multiple emissions; find the one with dialog closed and config set
            while (finalState.isConfigDialogOpen || finalState.reportData?.annualConfig == null) {
                finalState = awaitItem()
            }

            assertFalse(finalState.isConfigDialogOpen)
            assertNotNull(finalState.reportData?.annualConfig)
            assertEquals(1800, finalState.reportData!!.annualConfig!!.configuredHours)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `config dialog open then cancel does not change config data`() = runTest {
        val currentYear = LocalDate.now().year

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // month loaded

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            // Open config dialog
            viewModel.openConfigDialog()
            advanceUntilIdle()
            val dialogOpen = awaitItem()
            assertTrue(dialogOpen.isConfigDialogOpen)

            // Close without saving
            viewModel.closeConfigDialog()
            advanceUntilIdle()
            val dialogClosed = awaitItem()

            assertFalse(dialogClosed.isConfigDialogOpen)
            assertNull(dialogClosed.reportData?.annualConfig)

            // Verify save was never called
            coVerify(exactly = 0) { annualHoursConfigRepository.save(any(), any()) }

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `config dialog delete existing config removes it from reportData`() = runTest {
        val currentYear = LocalDate.now().year
        val configFlow = MutableStateFlow<AnnualHoursConfig?>(
            AnnualHoursConfig(
                id = "config-1",
                year = currentYear,
                configuredHours = 2000,
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        every { annualHoursConfigRepository.getByYear(currentYear) } returns configFlow
        coEvery { annualHoursConfigRepository.softDelete(currentYear) } coAnswers {
            configFlow.value = null
            Result.success(Unit)
        }

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // month loaded

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()

            // Find state with config loaded
            var yearState = awaitItem()
            if (yearState.reportData?.annualConfig == null) {
                yearState = awaitItem()
            }
            assertNotNull(yearState.reportData?.annualConfig)
            assertEquals(2000, yearState.reportData!!.annualConfig!!.configuredHours)

            // Open dialog and delete
            viewModel.openConfigDialog()
            advanceUntilIdle()
            awaitItem() // dialog open

            viewModel.deleteAnnualConfig()
            advanceUntilIdle()

            // Wait for config to be removed
            var finalState = awaitItem()
            while (finalState.isConfigDialogOpen || finalState.reportData?.annualConfig != null) {
                finalState = awaitItem()
            }

            assertFalse(finalState.isConfigDialogOpen)
            assertNull(finalState.reportData?.annualConfig)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `config dialog tracks isConfigDialogOpen correctly across mode switches`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // loaded

            // Switch to Year mode and open dialog
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            viewModel.openConfigDialog()
            advanceUntilIdle()
            val withDialog = awaitItem()
            assertTrue(withDialog.isConfigDialogOpen)

            // Close dialog
            viewModel.closeConfigDialog()
            advanceUntilIdle()
            val closed = awaitItem()
            assertFalse(closed.isConfigDialogOpen)

            // Switch back to Month mode — dialog should remain closed
            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            val monthState = awaitItem()
            assertFalse(monthState.isConfigDialogOpen)
            assertEquals(ReportMode.MONTH, monthState.mode)

            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region Integration: Empty state shows/hides correctly based on event data

    @Test
    fun `empty state transitions when navigating between months with and without data`() = runTest {
        val now = LocalDate.now()
        val currentMonthDate = now.withDayOfMonth(10).toString()

        // Return all events for any date range query — the ViewModel's
        // filterEventsForPeriod will exclude events whose startDay is outside the period
        val shiftEvent = createCalendarEventEntity(
            id = "event-1",
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = currentMonthDate,
            totalHours = 480,
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(listOf(shiftEvent))
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-1") } returns createShiftEntity(id = "shift-1")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            // Current month: event startDay is within the month → shifts present
            val populatedState = awaitItem()
            assertNotNull(populatedState.reportData)
            assertTrue(populatedState.reportData!!.shifts.isNotEmpty())
            assertEquals(480, populatedState.reportData!!.totalShiftMinutes)

            // Navigate to next month: event startDay is NOT within next month → filtered out
            viewModel.navigateNext()
            advanceUntilIdle()
            // May get intermediate emission with old reportData; consume until we get the updated one
            var emptyState = awaitItem()
            while (emptyState.reportData != null && emptyState.reportData!!.shifts.isNotEmpty()) {
                emptyState = awaitItem()
            }
            assertNotNull(emptyState.reportData)
            assertTrue(emptyState.reportData!!.shifts.isEmpty())
            assertEquals(0, emptyState.reportData!!.totalShiftMinutes)

            // Navigate back to current month: event is within range again
            viewModel.navigatePrevious()
            advanceUntilIdle()
            var backState = awaitItem()
            while (backState.reportData != null && backState.reportData!!.shifts.isEmpty()) {
                backState = awaitItem()
            }
            assertNotNull(backState.reportData)
            assertTrue(backState.reportData!!.shifts.isNotEmpty())
            assertEquals(480, backState.reportData!!.totalShiftMinutes)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `empty state when only reminders exist shows reminders section hides shifts`() = runTest {
        val today = currentMonthDate()
        val reminderEvent = createCalendarEventEntity(
            id = "event-1",
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = today,
            totalHours = 90,
        )

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(listOf(reminderEvent))
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { reminderDao.getById("reminder-1") } returns createReminderEntity(id = "reminder-1")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            // Shifts section hidden (empty), reminders visible
            assertTrue(state.reportData!!.shifts.isEmpty())
            assertFalse(state.reportData!!.reminders.isEmpty())
            assertEquals(1, state.reportData!!.reminders.size)
            assertEquals(90, state.reportData!!.totalReminderMinutes)
            assertEquals(0, state.reportData!!.totalShiftMinutes)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `empty state toggles when mode switches between month with data and year without`() = runTest {
        val now = LocalDate.now()
        val currentMonthDate = now.withDayOfMonth(15).toString()

        // Event from the current month — included in current month, also included in current year
        val shiftEvent = createCalendarEventEntity(
            id = "event-1",
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = currentMonthDate,
            totalHours = 300,
        )

        // The DAO returns this event for all queries; filterEventsForPeriod determines inclusion
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(listOf(shiftEvent))
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-1") } returns createShiftEntity(id = "shift-1")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            // Month mode (current month): event is in range → has data
            val monthState = awaitItem()
            assertNotNull(monthState.reportData)
            assertTrue(monthState.reportData!!.shifts.isNotEmpty())
            assertEquals(300, monthState.reportData!!.totalShiftMinutes)

            // Switch to Year mode: event is also in current year range → still has data
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            var yearState = awaitItem()
            // Consume intermediate states until reportData is updated for year mode
            while (yearState.mode != ReportMode.YEAR || yearState.reportData == null) {
                yearState = awaitItem()
            }
            assertNotNull(yearState.reportData)
            assertTrue(yearState.reportData!!.shifts.isNotEmpty())
            assertEquals(300, yearState.reportData!!.totalShiftMinutes)

            // Navigate year backward so the event is no longer in range
            viewModel.navigatePrevious()
            advanceUntilIdle()
            var pastYearState = awaitItem()
            while (pastYearState.reportData != null && pastYearState.reportData!!.shifts.isNotEmpty()) {
                pastYearState = awaitItem()
            }
            assertNotNull(pastYearState.reportData)
            assertTrue(pastYearState.reportData!!.shifts.isEmpty())

            // Switch back to Month mode — restores previous month/year (current month)
            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            var backToMonth = awaitItem()
            while (backToMonth.mode != ReportMode.MONTH || backToMonth.reportData == null || backToMonth.reportData!!.shifts.isEmpty()) {
                backToMonth = awaitItem()
            }
            assertNotNull(backToMonth.reportData)
            assertTrue(backToMonth.reportData!!.shifts.isNotEmpty())

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `deleted events are excluded from report data - empty state shown`() = runTest {
        val today = currentMonthDate()
        val deletedEvent = createCalendarEventEntity(
            id = "event-1",
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = today,
            totalHours = 480,
            isDeleted = true,
        )

        // The DAO filters by isDeleted=0, so deleted events are not returned
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1)

            val state = awaitItem()
            assertNotNull(state.reportData)
            assertTrue(state.reportData!!.shifts.isEmpty())
            assertTrue(state.reportData!!.reminders.isEmpty())
            assertEquals(0, state.reportData!!.totalShiftMinutes)
            assertEquals(0, state.reportData!!.totalReminderMinutes)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `mixed event types in same period show both sections - no empty state`() = runTest {
        val today = currentMonthDate()
        val events = listOf(
            createCalendarEventEntity(
                id = "event-1",
                eventType = "shift",
                eventTypeId = "shift-morning",
                startDay = today,
                totalHours = 480,
            ),
            createCalendarEventEntity(
                id = "event-2",
                eventType = "shift",
                eventTypeId = "shift-afternoon",
                startDay = today,
                totalHours = 360,
            ),
            createCalendarEventEntity(
                id = "event-3",
                eventType = "reminder",
                eventTypeId = "reminder-exercise",
                startDay = today,
                totalHours = 60,
            ),
        )

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(events)
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-morning") } returns createShiftEntity(
            id = "shift-morning",
            name = "Morning",
        )
        coEvery { shiftDao.getById("shift-afternoon") } returns createShiftEntity(
            id = "shift-afternoon",
            name = "Afternoon",
            backgroundColor = "#7C3AED",
        )
        coEvery { reminderDao.getById("reminder-exercise") } returns createReminderEntity(
            id = "reminder-exercise",
            name = "Exercise",
        )

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1)

            val state = awaitItem()
            assertNotNull(state.reportData)

            // Both sections populated — no empty state
            assertEquals(2, state.reportData!!.shifts.size)
            assertEquals(1, state.reportData!!.reminders.size)
            assertEquals(840, state.reportData!!.totalShiftMinutes)
            assertEquals(60, state.reportData!!.totalReminderMinutes)

            // Verify descending sort by total
            assertTrue(state.reportData!!.shifts[0].totalMinutes >= state.reportData!!.shifts[1].totalMinutes)

            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion
}
