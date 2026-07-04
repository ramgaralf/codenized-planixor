package com.codenized.planixor.data.local

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for ShiftModeSettingRepository.
 * Tests default record creation on first access and toggle state management.
 *
 * **Property 1: Setting state management**
 * **Validates: Requirements 2.1, 2.2**
 *
 * Feature: gh35-shift-mode
 */
class ShiftModeSettingRepositoryTest {

    private lateinit var dao: ShiftModeSettingDao
    private lateinit var repository: ShiftModeSettingRepository

    @Before
    fun setUp() {
        dao = mockk(relaxed = true)
        repository = ShiftModeSettingRepository(dao)
    }

    // --- Default record creation on first access ---

    @Test
    fun `observeEnabled should create default record when no record exists`() = runTest {
        val flow = MutableStateFlow<ShiftModeSettingEntity?>(null)
        coEvery { dao.get() } returns null
        coEvery { dao.observe() } returns flow

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } answers {
            flow.value = entitySlot.captured
        }

        val result = repository.observeEnabled().first()

        coVerify { dao.upsert(any()) }
        val created = entitySlot.captured
        assertNotNull(created.id)
        assertFalse(created.enabled)
        assertNull(created.syncedAt)
        assertFalse(created.isDeleted)
    }

    @Test
    fun `observeEnabled should return false when default record is created`() = runTest {
        val flow = MutableStateFlow<ShiftModeSettingEntity?>(null)
        coEvery { dao.get() } returns null
        coEvery { dao.observe() } returns flow

        coEvery { dao.upsert(any()) } answers {
            flow.value = firstArg()
        }

        val result = repository.observeEnabled().first()

        assertFalse(result)
    }

    @Test
    fun `toggle should create default record when no record exists then toggle it`() = runTest {
        coEvery { dao.get() } returns null

        val entities = mutableListOf<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entities)) } returns Unit

        repository.toggle()

        // First upsert creates the default (enabled=false), second upsert toggles to enabled=true
        assertEquals(2, entities.size)
        assertFalse(entities[0].enabled)
        assertTrue(entities[1].enabled)
    }

    // --- Toggle updates enabled/modifiedAt/syncedAt ---

    @Test
    fun `toggle should flip enabled from false to true`() = runTest {
        val existing = ShiftModeSettingEntity(
            id = "test-id",
            enabled = false,
            modifiedAt = 1_000_000_000_000L,
            syncedAt = 1_000_000_000_000L,
            isDeleted = false,
        )
        coEvery { dao.get() } returns existing

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        repository.toggle()

        assertTrue(entitySlot.captured.enabled)
    }

    @Test
    fun `toggle should flip enabled from true to false`() = runTest {
        val existing = ShiftModeSettingEntity(
            id = "test-id",
            enabled = true,
            modifiedAt = 1_000_000_000_000L,
            syncedAt = 1_000_000_000_000L,
            isDeleted = false,
        )
        coEvery { dao.get() } returns existing

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        repository.toggle()

        assertFalse(entitySlot.captured.enabled)
    }

    @Test
    fun `toggle should update modifiedAt to current time`() = runTest {
        val existing = ShiftModeSettingEntity(
            id = "test-id",
            enabled = false,
            modifiedAt = 1_000_000_000_000L,
            syncedAt = 1_000_000_000_000L,
            isDeleted = false,
        )
        coEvery { dao.get() } returns existing

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        val before = System.currentTimeMillis()
        repository.toggle()
        val after = System.currentTimeMillis()

        assertTrue(entitySlot.captured.modifiedAt in before..after)
        assertTrue(entitySlot.captured.modifiedAt > existing.modifiedAt)
    }

    @Test
    fun `toggle should set syncedAt to null to mark as pending sync`() = runTest {
        val existing = ShiftModeSettingEntity(
            id = "test-id",
            enabled = false,
            modifiedAt = 1_000_000_000_000L,
            syncedAt = 1_000_000_000_000L,
            isDeleted = false,
        )
        coEvery { dao.get() } returns existing

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        repository.toggle()

        assertNull(entitySlot.captured.syncedAt)
    }

    @Test
    fun `toggle should preserve the existing record id`() = runTest {
        val existing = ShiftModeSettingEntity(
            id = "existing-uuid",
            enabled = false,
            modifiedAt = 1_000_000_000_000L,
            syncedAt = 1_000_000_000_000L,
            isDeleted = false,
        )
        coEvery { dao.get() } returns existing

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        repository.toggle()

        assertEquals("existing-uuid", entitySlot.captured.id)
    }
}
