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
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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

@OptIn(ExperimentalCoroutinesApi::class)
class ReportsViewModelTest {

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

    /**
     * Returns an ISO date string within the current month for reliable test data.
     */
    private fun currentMonthDate(): String {
        val now = LocalDate.now()
        return now.withDayOfMonth(15).toString()
    }

    private fun setupEmptyEventFlow() {
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
    }

    // region ViewModel mode switching preserves/restores dates correctly

    @Test
    fun `switchMode Month to Year should preserve year and save previous month`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()
        val initialMonth = now.monthValue - 1
        val initialYear = now.year

        viewModel.uiState.test {
            // Consume initial loading emission
            skipItems(1)
            // Consume data-loaded emission
            awaitItem()

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()

            val state = awaitItem()
            assertEquals(ReportMode.YEAR, state.mode)
            assertEquals(initialYear, state.selectedYear)
            assertEquals(initialMonth, state.previousMonth)
            assertEquals(initialYear, state.previousYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `switchMode Year to Month should restore previous month and year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()
        val initialMonth = now.monthValue - 1
        val initialYear = now.year

        viewModel.uiState.test {
            skipItems(1) // initial loading
            awaitItem() // loaded data

            // Navigate forward one month
            viewModel.navigateNextMonth()
            advanceUntilIdle()
            awaitItem() // state after navigation

            val expectedSavedMonth = if (initialMonth < 11) initialMonth + 1 else 0
            val expectedSavedYear = if (initialMonth < 11) initialYear else initialYear + 1

            // Switch to Year — saves current month/year to previous fields
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem() // year mode state

            // Switch back to Month — should restore from previous fields
            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(ReportMode.MONTH, state.mode)
            assertEquals(expectedSavedMonth, state.selectedMonth)
            assertEquals(expectedSavedYear, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `switchMode to same mode should not change state`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // initial loading
            val loaded = awaitItem()
            assertEquals(ReportMode.MONTH, loaded.mode)

            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()

            // No state change expected
            expectNoEvents()
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `Year mode navigation does not affect restored month`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()
        val initialMonth = now.monthValue - 1
        val initialYear = now.year

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            // Switch to Year — saves initial month/year
            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            // Navigate year forward
            viewModel.navigateNextYear()
            advanceUntilIdle()
            awaitItem()

            // Switch back to Month — should restore original month/year
            viewModel.switchMode(ReportMode.MONTH)
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(ReportMode.MONTH, state.mode)
            assertEquals(initialMonth, state.selectedMonth)
            assertEquals(initialYear, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region DateNavigator boundary navigation

    @Test
    fun `navigatePreviousYear in Year mode decrements year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            viewModel.navigatePreviousYear()
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(now.year - 1, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `navigateNextYear in Year mode increments year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            viewModel.navigateNextYear()
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(now.year + 1, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `navigatePreviousMonth in Month mode wraps from January to December of previous year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            // Navigate back to January (month index 0)
            val navigationsToJanuary = now.monthValue - 1
            repeat(navigationsToJanuary) {
                viewModel.navigatePreviousMonth()
                advanceUntilIdle()
                awaitItem()
            }

            // Now at January; navigate back one more time → December previous year
            viewModel.navigatePreviousMonth()
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(11, state.selectedMonth) // December (0-indexed)
            assertEquals(now.year - 1, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `navigateNextMonth in Month mode wraps from December to January of next year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            // Navigate forward to December (month index 11)
            val navigationsToDecember = 11 - (now.monthValue - 1)
            repeat(navigationsToDecember) {
                viewModel.navigateNextMonth()
                advanceUntilIdle()
                awaitItem()
            }

            // Now at December; navigate forward → January next year
            viewModel.navigateNextMonth()
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(0, state.selectedMonth) // January (0-indexed)
            assertEquals(now.year + 1, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `navigateToday in Month mode resets to current month and year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            // Navigate away
            viewModel.navigateNextMonth()
            advanceUntilIdle()
            awaitItem()
            viewModel.navigateNextMonth()
            advanceUntilIdle()
            awaitItem()

            // Reset to today
            viewModel.navigateToday()
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(now.monthValue - 1, state.selectedMonth)
            assertEquals(now.year, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `navigateToday in Year mode resets to current year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()
            awaitItem()

            // Navigate away
            viewModel.navigatePreviousYear()
            advanceUntilIdle()
            awaitItem()
            viewModel.navigatePreviousYear()
            advanceUntilIdle()
            awaitItem()

            // Reset to today
            viewModel.navigateToday()
            advanceUntilIdle()
            val state = awaitItem()

            assertEquals(now.year, state.selectedYear)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region Empty state conditional rendering logic

    @Test
    fun `reportData with empty shifts and empty reminders should show empty state`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            assertTrue(state.reportData!!.shifts.isEmpty())
            assertTrue(state.reportData!!.reminders.isEmpty())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `reportData with only shift events should NOT show empty state`() = runTest {
        val today = currentMonthDate()
        val shiftEvent = createCalendarEventEntity(
            id = "event-1",
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = today,
            totalHours = 480,
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(listOf(shiftEvent))
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-1") } returns createShiftEntity(id = "shift-1")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            assertTrue(state.reportData!!.shifts.isNotEmpty())
            assertTrue(state.reportData!!.reminders.isEmpty())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `reportData with only reminder events should NOT show empty state`() = runTest {
        val today = currentMonthDate()
        val reminderEvent = createCalendarEventEntity(
            id = "event-1",
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = today,
            totalHours = 120,
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(listOf(reminderEvent))
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { reminderDao.getById("reminder-1") } returns createReminderEntity(id = "reminder-1")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            assertTrue(state.reportData!!.shifts.isEmpty())
            assertTrue(state.reportData!!.reminders.isNotEmpty())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `reportData with both shift and reminder events should have both sections`() = runTest {
        val today = currentMonthDate()
        val events = listOf(
            createCalendarEventEntity(
                id = "event-1",
                eventType = "shift",
                eventTypeId = "shift-1",
                startDay = today,
                totalHours = 480,
            ),
            createCalendarEventEntity(
                id = "event-2",
                eventType = "reminder",
                eventTypeId = "reminder-1",
                startDay = today,
                totalHours = 120,
            ),
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(events)
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-1") } returns createShiftEntity(id = "shift-1")
        coEvery { reminderDao.getById("reminder-1") } returns createReminderEntity(id = "reminder-1")

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            assertTrue(state.reportData!!.shifts.isNotEmpty())
            assertTrue(state.reportData!!.reminders.isNotEmpty())
            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region AnnualConfigDialog validation

    @Test
    fun `openConfigDialog sets isConfigDialogOpen to true`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            viewModel.openConfigDialog()
            advanceUntilIdle()
            val state = awaitItem()

            assertTrue(state.isConfigDialogOpen)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `closeConfigDialog sets isConfigDialogOpen to false`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1)
            awaitItem()

            viewModel.openConfigDialog()
            advanceUntilIdle()
            awaitItem()

            viewModel.closeConfigDialog()
            advanceUntilIdle()
            val state = awaitItem()

            assertFalse(state.isConfigDialogOpen)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `annual config in Year mode is loaded and reflected in reportData`() = runTest {
        val currentYear = LocalDate.now().year
        val config = AnnualHoursConfig(
            id = "config-1",
            year = currentYear,
            configuredHours = 1800,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        every { annualHoursConfigRepository.getByYear(currentYear) } returns flowOf(config)

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading
            awaitItem() // month mode loaded

            viewModel.switchMode(ReportMode.YEAR)
            advanceUntilIdle()

            // There may be multiple emissions during mode switch; find the one with year mode data
            var state = awaitItem()
            // If first emission is just the mode change without reportData, await the next
            if (state.reportData?.annualConfig == null && state.mode == ReportMode.YEAR) {
                state = awaitItem()
            }

            assertEquals(ReportMode.YEAR, state.mode)
            assertNotNull(state.reportData)
            assertNotNull(state.reportData!!.annualConfig)
            assertEquals(1800, state.reportData!!.annualConfig!!.configuredHours)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `annual config in Month mode should be null`() = runTest {
        val currentYear = LocalDate.now().year
        val config = AnnualHoursConfig(
            id = "config-1",
            year = currentYear,
            configuredHours = 1800,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )

        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(emptyList())
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(config)

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertEquals(ReportMode.MONTH, state.mode)
            assertNotNull(state.reportData)
            assertNull(state.reportData!!.annualConfig)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region Sort order: alphabetical (monthly shifts table) vs descending (bars, annual table)

    @Test
    fun `shifts in reportData are sorted descending by totalMinutes for bar chart`() = runTest {
        val today = currentMonthDate()
        val shiftEvents = listOf(
            createCalendarEventEntity(
                id = "event-1",
                eventType = "shift",
                eventTypeId = "shift-afternoon",
                startDay = today,
                totalHours = 300,
            ),
            createCalendarEventEntity(
                id = "event-2",
                eventType = "shift",
                eventTypeId = "shift-morning",
                startDay = today,
                totalHours = 480,
            ),
            createCalendarEventEntity(
                id = "event-3",
                eventType = "shift",
                eventTypeId = "shift-night",
                startDay = today,
                totalHours = 120,
            ),
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(shiftEvents)
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-morning") } returns createShiftEntity(
            id = "shift-morning", name = "Morning",
        )
        coEvery { shiftDao.getById("shift-afternoon") } returns createShiftEntity(
            id = "shift-afternoon", name = "Afternoon",
        )
        coEvery { shiftDao.getById("shift-night") } returns createShiftEntity(
            id = "shift-night", name = "Night",
        )

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            val shifts = state.reportData!!.shifts
            assertEquals(3, shifts.size)
            // ViewModel sorts descending by totalMinutes (for bar chart)
            assertEquals(480, shifts[0].totalMinutes)
            assertEquals(300, shifts[1].totalMinutes)
            assertEquals(120, shifts[2].totalMinutes)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `shifts table in monthly mode uses alphabetical sort in Screen`() = runTest {
        val today = currentMonthDate()
        val shiftEvents = listOf(
            createCalendarEventEntity(
                id = "event-1",
                eventType = "shift",
                eventTypeId = "shift-1",
                startDay = today,
                totalHours = 480,
            ),
            createCalendarEventEntity(
                id = "event-2",
                eventType = "shift",
                eventTypeId = "shift-2",
                startDay = today,
                totalHours = 300,
            ),
            createCalendarEventEntity(
                id = "event-3",
                eventType = "shift",
                eventTypeId = "shift-3",
                startDay = today,
                totalHours = 120,
            ),
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(shiftEvents)
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { shiftDao.getById("shift-1") } returns createShiftEntity(
            id = "shift-1", name = "Zulu",
        )
        coEvery { shiftDao.getById("shift-2") } returns createShiftEntity(
            id = "shift-2", name = "Alpha",
        )
        coEvery { shiftDao.getById("shift-3") } returns createShiftEntity(
            id = "shift-3", name = "Morning",
        )

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            val shifts = state.reportData!!.shifts

            // ViewModel delivers descending by hours
            assertEquals("Zulu", shifts[0].name)
            assertEquals("Alpha", shifts[1].name)
            assertEquals("Morning", shifts[2].name)

            // The Screen re-sorts alphabetically for monthly table:
            val sortedForTable = shifts.sortedBy { it.name }
            assertEquals("Alpha", sortedForTable[0].name)
            assertEquals("Morning", sortedForTable[1].name)
            assertEquals("Zulu", sortedForTable[2].name)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `reminders in reportData are sorted descending by totalMinutes`() = runTest {
        val today = currentMonthDate()
        val reminderEvents = listOf(
            createCalendarEventEntity(
                id = "event-1",
                eventType = "reminder",
                eventTypeId = "reminder-1",
                startDay = today,
                totalHours = 60,
            ),
            createCalendarEventEntity(
                id = "event-2",
                eventType = "reminder",
                eventTypeId = "reminder-2",
                startDay = today,
                totalHours = 240,
            ),
        )
        every { calendarEventDao.getByDateRange(any(), any()) } returns flowOf(reminderEvents)
        every { annualHoursConfigRepository.getByYear(any()) } returns flowOf(null)
        coEvery { reminderDao.getById("reminder-1") } returns createReminderEntity(
            id = "reminder-1", name = "Meditation",
        )
        coEvery { reminderDao.getById("reminder-2") } returns createReminderEntity(
            id = "reminder-2", name = "Exercise",
        )

        val viewModel = createViewModel()

        viewModel.uiState.test {
            skipItems(1) // loading

            val state = awaitItem()
            assertNotNull(state.reportData)
            val reminders = state.reportData!!.reminders
            assertEquals(2, reminders.size)
            // Descending by totalMinutes
            assertEquals(240, reminders[0].totalMinutes)
            assertEquals(60, reminders[1].totalMinutes)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // endregion

    // region Initial state

    @Test
    fun `initial state defaults to Month mode with current month and year`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        val now = LocalDate.now()
        val initialState = viewModel.uiState.value
        assertEquals(ReportMode.MONTH, initialState.mode)
        assertEquals(now.monthValue - 1, initialState.selectedMonth)
        assertEquals(now.year, initialState.selectedYear)
    }

    @Test
    fun `initial state has isLoading true before data arrives`() = runTest {
        setupEmptyEventFlow()
        val viewModel = createViewModel()

        assertTrue(viewModel.uiState.value.isLoading)
    }

    // endregion
}
