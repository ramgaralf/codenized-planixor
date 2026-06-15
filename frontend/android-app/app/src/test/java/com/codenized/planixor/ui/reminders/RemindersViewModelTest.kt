package com.codenized.planixor.ui.reminders

import app.cash.turbine.test
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ReminderEntity
import com.codenized.planixor.data.local.ReminderRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RemindersViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var reminderDao: ReminderDao

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createReminderEntity(
        id: String = "reminder-1",
        name: String = "Take Medicine",
        icon: String = "💊",
        backgroundColor: String = "#EF4444",
        isActive: Boolean = true,
        createdAt: Long = 1000L,
        modifiedAt: Long = 2000L,
        syncedAt: Long? = null,
        isDeleted: Boolean = false,
    ): ReminderEntity = ReminderEntity(
        id = id,
        name = name,
        icon = icon,
        backgroundColor = backgroundColor,
        isActive = isActive,
        createdAt = createdAt,
        modifiedAt = modifiedAt,
        syncedAt = syncedAt,
        isDeleted = isDeleted,
    )

    // --- State transitions: loading → loaded ---

    @Test
    fun `initial state should have isLoading true`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flow {
            kotlinx.coroutines.awaitCancellation()
        }
        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)

        assertTrue(viewModel.uiState.value.isLoading)
        assertTrue(viewModel.uiState.value.reminders.isEmpty())
        assertNull(viewModel.uiState.value.error)
    }

    @Test
    fun `should transition from loading to loaded when flow emits reminders`() = runTest {
        reminderDao = mockk(relaxed = true)
        val entities = listOf(
            createReminderEntity(id = "1", name = "Take Medicine"),
            createReminderEntity(id = "2", name = "Water Plants"),
        )
        every { reminderDao.getAllActive() } returns flowOf(entities)

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)

        viewModel.uiState.test {
            // Initial: loading
            val initial = awaitItem()
            assertTrue(initial.isLoading)

            // After flow emits: loaded with reminders
            val loaded = awaitItem()
            assertFalse(loaded.isLoading)
            assertNull(loaded.error)
            assertEquals(2, loaded.reminders.size)
            assertEquals("Take Medicine", loaded.reminders[0].name)
            assertEquals("Water Plants", loaded.reminders[1].name)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `should transition from loading to loaded with empty list`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(emptyList())

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)

        viewModel.uiState.test {
            val initial = awaitItem()
            assertTrue(initial.isLoading)

            val loaded = awaitItem()
            assertFalse(loaded.isLoading)
            assertNull(loaded.error)
            assertTrue(loaded.reminders.isEmpty())

            cancelAndIgnoreRemainingEvents()
        }
    }

    // --- State transitions: loading → error ---

    @Test
    fun `should transition from loading to error when flow throws`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flow {
            throw RuntimeException("Database read failed")
        }

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)

        viewModel.uiState.test {
            val initial = awaitItem()
            assertTrue(initial.isLoading)

            val errorState = awaitItem()
            assertFalse(errorState.isLoading)
            assertEquals("Database read failed", errorState.error)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `should use default error message when exception has no message`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flow {
            throw RuntimeException()
        }

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)

        viewModel.uiState.test {
            awaitItem() // loading

            val errorState = awaitItem()
            assertFalse(errorState.isLoading)
            assertEquals("Could not load reminders", errorState.error)

            cancelAndIgnoreRemainingEvents()
        }
    }

    // --- Deactivation state changes ---

    @Test
    fun `requestDeactivate should set confirmDeactivateId`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1")),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.requestDeactivate("r-1")

        assertEquals("r-1", viewModel.uiState.value.confirmDeactivateId)
    }

    @Test
    fun `confirmDeactivate should call repository deactivate and clear dialog`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1")),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.requestDeactivate("r-1")
        viewModel.confirmDeactivate()
        advanceUntilIdle()

        assertNull(viewModel.uiState.value.confirmDeactivateId)
        coVerify { reminderDao.setActive("r-1", false, any()) }
    }

    @Test
    fun `dismissDeactivate should clear confirmDeactivateId without repository call`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1")),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.requestDeactivate("r-1")
        viewModel.dismissDeactivate()

        assertNull(viewModel.uiState.value.confirmDeactivateId)
        coVerify(exactly = 0) { reminderDao.setActive(any(), any(), any()) }
    }

    // --- Activation state changes ---

    @Test
    fun `activate should call repository activate without confirmation`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1", isActive = false)),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.activate("r-1")
        advanceUntilIdle()

        // No confirmation dialog shown
        assertNull(viewModel.uiState.value.confirmDeactivateId)
        coVerify { reminderDao.setActive("r-1", true, any()) }
    }

    // --- Delete confirmation ---

    @Test
    fun `requestDelete should set confirmDeleteId`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1")),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.requestDelete("r-1")

        assertEquals("r-1", viewModel.uiState.value.confirmDeleteId)
    }

    @Test
    fun `confirmDelete should call repository softDelete and clear dialog`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1")),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.requestDelete("r-1")
        viewModel.confirmDelete()
        advanceUntilIdle()

        assertNull(viewModel.uiState.value.confirmDeleteId)
        coVerify { reminderDao.softDelete("r-1", any()) }
    }

    @Test
    fun `dismissDelete should clear confirmDeleteId without repository call`() = runTest {
        reminderDao = mockk(relaxed = true)
        every { reminderDao.getAllActive() } returns flowOf(
            listOf(createReminderEntity(id = "r-1")),
        )

        val repository = ReminderRepository(reminderDao)
        val viewModel = RemindersViewModel(repository)
        advanceUntilIdle()

        viewModel.requestDelete("r-1")
        viewModel.dismissDelete()

        assertNull(viewModel.uiState.value.confirmDeleteId)
        coVerify(exactly = 0) { reminderDao.softDelete(any(), any()) }
    }
}
