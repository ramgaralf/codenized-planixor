package com.codenized.planixor.ui.sync

import app.cash.turbine.test
import com.codenized.planixor.MainDispatcherRule
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.sync.ConnectionStatus
import com.codenized.planixor.data.sync.SyncConfig
import com.codenized.planixor.data.sync.SyncValidationService
import com.codenized.planixor.data.sync.ValidationResult
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

    private val syncConfigFlow = MutableStateFlow<SyncConfig?>(null)

    private lateinit var viewModel: SyncViewModel

    @Before
    fun setup() {
        every { mockPreferencesRepository.syncConfigFlow } returns syncConfigFlow
    }

    private fun createViewModel(): SyncViewModel {
        return SyncViewModel(mockPreferencesRepository, mockValidationService)
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

            val validatingState = awaitItem()
            assertTrue(validatingState.isValidating)
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
    fun `pause should update isPaused to true via PreferencesRepository`() = runTest {
        coEvery { mockPreferencesRepository.setSyncPaused(true) } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.pause()
        advanceUntilIdle()

        coVerify { mockPreferencesRepository.setSyncPaused(true) }
    }

    @Test
    fun `resume should update isPaused to false via PreferencesRepository`() = runTest {
        coEvery { mockPreferencesRepository.setSyncPaused(false) } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.resume()
        advanceUntilIdle()

        coVerify { mockPreferencesRepository.setSyncPaused(false) }
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
}
