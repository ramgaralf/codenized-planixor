package com.codenized.planixor.ui.sync

import app.cash.turbine.test
import com.codenized.planixor.MainDispatcherRule
import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.sync.ConnectionStatus
import com.codenized.planixor.data.sync.SyncConfig
import com.codenized.planixor.data.sync.SyncValidationService
import com.codenized.planixor.data.sync.ValidationResult
import io.mockk.Ordering
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SyncViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val mockPreferencesRepository = mockk<PreferencesRepository>(relaxed = true)
    private val mockValidationService = mockk<SyncValidationService>()
    private val mockCalendarEventDao = mockk<CalendarEventDao>(relaxed = true)
    private val mockShiftDao = mockk<ShiftDao>(relaxed = true)
    private val mockReminderDao = mockk<ReminderDao>(relaxed = true)
    private val mockNotificationRecordDao = mockk<NotificationRecordDao>(relaxed = true)
    private val mockAnnualHoursConfigDao = mockk<AnnualHoursConfigDao>(relaxed = true)

    private val syncConfigFlow = MutableStateFlow<SyncConfig?>(null)
    private val connectionStatusFlow = MutableStateFlow(ConnectionStatus.UNCONFIGURED)

    private lateinit var viewModel: SyncViewModel

    @Before
    fun setup() {
        every { mockPreferencesRepository.syncConfigFlow } returns syncConfigFlow
        every { mockPreferencesRepository.connectionStatusFlow } returns connectionStatusFlow
    }

    private fun createViewModel(): SyncViewModel {
        return SyncViewModel(
            mockPreferencesRepository,
            mockValidationService,
            mockCalendarEventDao,
            mockShiftDao,
            mockReminderDao,
            mockNotificationRecordDao,
            mockAnnualHoursConfigDao,
        )
    }

    @Test
    fun `initial state should be unconfigured with no config`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.config)
        assertEquals(ConnectionStatus.UNCONFIGURED, state.connectionStatus)
        assertFalse(state.isPaused)
        assertNull(state.lastSyncedAt)
        assertFalse(state.isValidating)
        assertNull(state.validationError)
    }

    @Test
    fun `validateAndSave should set isValidating true while validating`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } coAnswers {
            kotlinx.coroutines.delay(500)
            ValidationResult(success = true, username = "testuser")
        }
        coEvery { mockPreferencesRepository.saveSyncConfig(any()) } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            awaitItem() // initial state

            viewModel.validateAndSave("https://server.com", "key-123")

            // First state: hasAttemptedSubmit = true, then isValidating = true
            val states = mutableListOf<SyncUiState>()
            states.add(awaitItem())
            // May need one more emission for isValidating
            if (!states.last().isValidating) {
                states.add(awaitItem())
            }

            val validatingState = states.last()
            assertTrue(validatingState.isValidating)
            assertTrue(validatingState.hasAttemptedSubmit)
            assertNull(validatingState.validationError)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `validateAndSave should set config and active status on success`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "pepito")
        coEvery { mockPreferencesRepository.saveSyncConfig(any()) } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://backend.planixor.com", "sk-abc123")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isValidating)
        assertNull(state.validationError)

        coVerify {
            mockPreferencesRepository.saveSyncConfig(
                SyncConfig(
                    serverUrl = "https://backend.planixor.com",
                    apiKey = "sk-abc123",
                    username = "pepito",
                    isPaused = false,
                    lastSyncedAt = null,
                )
            )
        }
    }

    @Test
    fun `validateAndSave should set validationError on failure`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = false, error = "invalid_api_key")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "bad-key")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isValidating)
        assertEquals("invalid_api_key", state.validationError)
    }

    @Test
    fun `pause should persist isPaused true and set ConnectionStatus PAUSED`() = runTest {
        coEvery { mockPreferencesRepository.setSyncPaused(true) } returns Unit
        coEvery { mockPreferencesRepository.saveConnectionStatus(ConnectionStatus.PAUSED) } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.pause()
        advanceUntilIdle()

        coVerify(ordering = Ordering.ORDERED) {
            mockPreferencesRepository.setSyncPaused(true)
            mockPreferencesRepository.saveConnectionStatus(ConnectionStatus.PAUSED)
        }
        assertEquals(ConnectionStatus.PAUSED, viewModel.uiState.value.connectionStatus)
    }

    @Test
    fun `resume should persist isPaused false, set ConnectionStatus ACTIVE, and trigger sync`() = runTest {
        coEvery { mockPreferencesRepository.setSyncPaused(false) } returns Unit
        coEvery { mockPreferencesRepository.saveConnectionStatus(ConnectionStatus.ACTIVE) } returns Unit

        // Start with a paused config
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "user1",
            isPaused = true,
            lastSyncedAt = null,
        )
        connectionStatusFlow.value = ConnectionStatus.PAUSED

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.resume()
        advanceUntilIdle()

        coVerify(ordering = Ordering.ORDERED) {
            mockPreferencesRepository.setSyncPaused(false)
            mockPreferencesRepository.saveConnectionStatus(ConnectionStatus.ACTIVE)
        }
        assertEquals(ConnectionStatus.ACTIVE, viewModel.uiState.value.connectionStatus)
    }

    @Test
    fun `clearConfig should reset state to unconfigured`() = runTest {
        coEvery { mockPreferencesRepository.clearSyncConfig() } returns Unit

        // Start with a configured state
        val config = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "user1",
            isPaused = false,
            lastSyncedAt = null,
        )
        syncConfigFlow.value = config
        connectionStatusFlow.value = ConnectionStatus.ACTIVE

        viewModel = createViewModel()
        advanceUntilIdle()

        // Verify configured state
        assertEquals(ConnectionStatus.ACTIVE, viewModel.uiState.value.connectionStatus)
        assertEquals(config, viewModel.uiState.value.config)

        // Simulate clearing config (flow will emit null when DataStore clears)
        viewModel.clearConfig()
        advanceUntilIdle()

        coVerify { mockPreferencesRepository.clearSyncConfig() }

        // Simulate the flow update that clearSyncConfig triggers
        syncConfigFlow.value = null
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.config)
        assertEquals(ConnectionStatus.UNCONFIGURED, state.connectionStatus)
        assertFalse(state.isPaused)
    }

    // --- Username change detection tests ---

    @Test
    fun `validateAndSave should save directly on first-time config without showing dialog`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "newUser")
        coEvery { mockPreferencesRepository.saveSyncConfig(any()) } returns Unit

        // No existing config (first-time)
        syncConfigFlow.value = null

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "key-123")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.pendingUsernameChange)
        assertFalse(state.isValidating)
        coVerify { mockPreferencesRepository.saveSyncConfig(any()) }
    }

    @Test
    fun `validateAndSave should save directly when username matches`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "sameUser")
        coEvery { mockPreferencesRepository.saveSyncConfig(any()) } returns Unit

        // Existing config with same username
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://old-server.com",
            apiKey = "old-key",
            username = "sameUser",
            isPaused = false,
            lastSyncedAt = 123456L,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://new-server.com", "new-key")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.pendingUsernameChange)
        assertFalse(state.isValidating)
        coVerify { mockPreferencesRepository.saveSyncConfig(any()) }
    }

    @Test
    fun `validateAndSave should trigger pendingUsernameChange when username differs`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "newUser")

        // Existing config with different username
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "oldUser",
            isPaused = false,
            lastSyncedAt = 123456L,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "key-456")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.pendingUsernameChange)
        assertEquals("oldUser", state.pendingUsernameChange!!.previousUsername)
        assertEquals("newUser", state.pendingUsernameChange!!.newUsername)
        assertFalse(state.isValidating)
        assertNull(state.validationError)
    }

    @Test
    fun `validateAndSave username comparison should be case-sensitive`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "User")

        // Existing config with lowercase username
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "user",
            isPaused = false,
            lastSyncedAt = 123456L,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "key-456")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.pendingUsernameChange)
        assertEquals("user", state.pendingUsernameChange!!.previousUsername)
        assertEquals("User", state.pendingUsernameChange!!.newUsername)
    }

    @Test
    fun `confirmUsernameChange should wipe data and save new config`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "newUser")
        coEvery { mockPreferencesRepository.saveSyncConfig(any()) } returns Unit
        coEvery { mockCalendarEventDao.deleteAll() } returns Unit
        coEvery { mockShiftDao.deleteAll() } returns Unit
        coEvery { mockReminderDao.deleteAll() } returns Unit
        coEvery { mockNotificationRecordDao.deleteAll() } returns Unit
        coEvery { mockAnnualHoursConfigDao.deleteAll() } returns Unit

        // Existing config with different username
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "oldUser",
            isPaused = false,
            lastSyncedAt = 123456L,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "key-456")
        advanceUntilIdle()

        // Confirm the username change
        viewModel.confirmUsernameChange()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.pendingUsernameChange)
        assertNull(state.validationError)

        // Verify all data was wiped
        coVerify { mockCalendarEventDao.deleteAll() }
        coVerify { mockShiftDao.deleteAll() }
        coVerify { mockReminderDao.deleteAll() }
        coVerify { mockNotificationRecordDao.deleteAll() }
        coVerify { mockAnnualHoursConfigDao.deleteAll() }

        // Verify new config was saved
        coVerify {
            mockPreferencesRepository.saveSyncConfig(
                match { it.username == "newUser" && it.lastSyncedAt == null }
            )
        }
    }

    @Test
    fun `confirmUsernameChange should abort and show error when deletion fails`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "newUser")
        coEvery { mockCalendarEventDao.deleteAll() } throws RuntimeException("DB error")

        // Existing config with different username
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "oldUser",
            isPaused = false,
            lastSyncedAt = 123456L,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "key-456")
        advanceUntilIdle()

        // Confirm the username change (deletion will fail)
        viewModel.confirmUsernameChange()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.pendingUsernameChange)
        assertEquals("data_reset_failed", state.validationError)

        // saveSyncConfig should NOT have been called
        coVerify(exactly = 0) { mockPreferencesRepository.saveSyncConfig(any()) }
    }

    @Test
    fun `cancelUsernameChange should clear pending state`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "newUser")

        // Existing config with different username
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://server.com",
            apiKey = "key-123",
            username = "oldUser",
            isPaused = false,
            lastSyncedAt = 123456L,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://server.com", "key-456")
        advanceUntilIdle()

        // Verify dialog state is set
        assertNotNull(viewModel.uiState.value.pendingUsernameChange)

        // Cancel
        viewModel.cancelUsernameChange()

        val state = viewModel.uiState.value
        assertNull(state.pendingUsernameChange)
        assertNull(state.validationError)
    }

    @Test
    fun `validateAndSave should preserve lastSyncedAt when username matches`() = runTest {
        coEvery { mockValidationService.validate(any(), any()) } returns
            ValidationResult(success = true, username = "sameUser")
        coEvery { mockPreferencesRepository.saveSyncConfig(any()) } returns Unit

        val existingLastSynced = 999999L
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://old-server.com",
            apiKey = "old-key",
            username = "sameUser",
            isPaused = false,
            lastSyncedAt = existingLastSynced,
        )

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.validateAndSave("https://new-server.com", "new-key")
        advanceUntilIdle()

        coVerify {
            mockPreferencesRepository.saveSyncConfig(
                match { it.lastSyncedAt == existingLastSynced }
            )
        }
    }
}
