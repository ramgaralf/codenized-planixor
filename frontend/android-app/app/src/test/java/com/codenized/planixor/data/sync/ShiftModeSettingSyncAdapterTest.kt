package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.ShiftModeSettingDao
import com.codenized.planixor.data.local.ShiftModeSettingEntity
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

/**
 * Unit tests for ShiftModeSettingSyncAdapter.
 * Tests push identification of unsynced records and LWW merge on pull.
 *
 * **Property 1: Setting state management**
 * **Property 2: Last-Writer-Wins conflict resolution**
 * **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
 *
 * Feature: gh35-shift-mode
 */
class ShiftModeSettingSyncAdapterTest {

    private lateinit var dao: ShiftModeSettingDao
    private lateinit var apiService: ShiftModeSettingSyncApiService
    private lateinit var adapter: ShiftModeSettingSyncAdapter

    @Before
    fun setUp() {
        dao = mockk(relaxed = true)
        apiService = mockk(relaxed = true)
        adapter = ShiftModeSettingSyncAdapter(dao, apiService)
    }

    // --- Push identifies unsynced records correctly ---

    @Test
    fun `push should identify records with null syncedAt as unsynced`() = runTest {
        val unsyncedEntity = ShiftModeSettingEntity(
            id = "setting-1",
            enabled = true,
            modifiedAt = 1_700_000_000_000L,
            syncedAt = null,
            isDeleted = false,
        )
        coEvery { dao.getUnsyncedRecords() } returns listOf(unsyncedEntity)
        coEvery { apiService.push(any()) } returns Response.success(
            GenericApiResponse(data = ShiftModeSettingSyncPushResponse(syncedCount = 1))
        )

        val result = adapter.push()

        assertTrue(result.success)
        assertEquals(1, result.pushed)
        coVerify { apiService.push(any()) }
    }

    @Test
    fun `push should identify records with modifiedAt greater than syncedAt as unsynced`() = runTest {
        val modifiedEntity = ShiftModeSettingEntity(
            id = "setting-1",
            enabled = true,
            modifiedAt = 1_700_000_100_000L,
            syncedAt = 1_700_000_000_000L,
            isDeleted = false,
        )
        coEvery { dao.getUnsyncedRecords() } returns listOf(modifiedEntity)
        coEvery { apiService.push(any()) } returns Response.success(
            GenericApiResponse(data = ShiftModeSettingSyncPushResponse(syncedCount = 1))
        )

        val result = adapter.push()

        assertTrue(result.success)
        assertEquals(1, result.pushed)
    }

    @Test
    fun `push should not call API when no unsynced records exist`() = runTest {
        coEvery { dao.getUnsyncedRecords() } returns emptyList()

        val result = adapter.push()

        assertTrue(result.success)
        assertEquals(0, result.pushed)
        coVerify(exactly = 0) { apiService.push(any()) }
    }

    // --- LWW merge on pull: newer remote modifiedAt wins ---

    @Test
    fun `pull should overwrite local when remote modifiedAt is newer`() = runTest {
        val localEntity = ShiftModeSettingEntity(
            id = "setting-1",
            enabled = false,
            modifiedAt = 1_700_000_000_000L,
            syncedAt = 1_700_000_000_000L,
            isDeleted = false,
        )
        val remoteRecord = ShiftModeSettingSyncRecord(
            id = "setting-1",
            enabled = true,
            modifiedAt = "2025-01-15T12:00:00Z",
            isDeleted = false,
        )

        coEvery { dao.getAll() } returns listOf(localEntity)
        coEvery { apiService.pull(any(), any()) } returns Response.success(
            GenericApiResponse(
                data = ShiftModeSettingSyncPullResponse(
                    records = listOf(remoteRecord),
                    cursor = null,
                    hasMore = false,
                )
            )
        )

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        val result = adapter.pull(null)

        assertTrue(result.success)
        assertEquals(0, result.inserted)
        assertEquals(1, result.updated)
        assertTrue(entitySlot.captured.enabled)
        assertEquals("setting-1", entitySlot.captured.id)
    }

    // --- LWW merge on pull: older remote modifiedAt is rejected ---

    @Test
    fun `pull should keep local when remote modifiedAt is older`() = runTest {
        // Local modifiedAt = 2025-01-16T00:00:00Z = 1736985600000
        val localEntity = ShiftModeSettingEntity(
            id = "setting-1",
            enabled = true,
            modifiedAt = 1_736_985_600_000L,
            syncedAt = 1_736_985_600_000L,
            isDeleted = false,
        )
        // Remote modifiedAt is earlier
        val remoteRecord = ShiftModeSettingSyncRecord(
            id = "setting-1",
            enabled = false,
            modifiedAt = "2025-01-14T10:00:00Z",
            isDeleted = false,
        )

        coEvery { dao.getAll() } returns listOf(localEntity)
        coEvery { apiService.pull(any(), any()) } returns Response.success(
            GenericApiResponse(
                data = ShiftModeSettingSyncPullResponse(
                    records = listOf(remoteRecord),
                    cursor = null,
                    hasMore = false,
                )
            )
        )

        val result = adapter.pull(null)

        assertTrue(result.success)
        assertEquals(0, result.inserted)
        assertEquals(0, result.updated)
        // dao.upsert should NOT have been called for this record since remote is older
        coVerify(exactly = 0) { dao.upsert(any()) }
    }

    // --- LWW merge on pull: new remote record is inserted ---

    @Test
    fun `pull should insert remote record when no local record exists`() = runTest {
        val remoteRecord = ShiftModeSettingSyncRecord(
            id = "setting-new",
            enabled = true,
            modifiedAt = "2025-01-15T12:00:00Z",
            isDeleted = false,
        )

        coEvery { dao.getAll() } returns emptyList()
        coEvery { apiService.pull(any(), any()) } returns Response.success(
            GenericApiResponse(
                data = ShiftModeSettingSyncPullResponse(
                    records = listOf(remoteRecord),
                    cursor = null,
                    hasMore = false,
                )
            )
        )

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        val result = adapter.pull(null)

        assertTrue(result.success)
        assertEquals(1, result.inserted)
        assertEquals(0, result.updated)
        assertEquals("setting-new", entitySlot.captured.id)
        assertTrue(entitySlot.captured.enabled)
    }

    // --- DateTime ISO normalization (appends Z when missing) ---

    @Test
    fun `pull should parse ISO datetime without Z suffix correctly`() = runTest {
        // Backend sends datetime without Z: "2025-01-15T10:30:00"
        val remoteRecord = ShiftModeSettingSyncRecord(
            id = "setting-no-z",
            enabled = true,
            modifiedAt = "2025-01-15T10:30:00",
            isDeleted = false,
        )

        coEvery { dao.getAll() } returns emptyList()
        coEvery { apiService.pull(any(), any()) } returns Response.success(
            GenericApiResponse(
                data = ShiftModeSettingSyncPullResponse(
                    records = listOf(remoteRecord),
                    cursor = null,
                    hasMore = false,
                )
            )
        )

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        val result = adapter.pull(null)

        assertTrue(result.success)
        assertEquals(1, result.inserted)
        // "2025-01-15T10:30:00Z" → 1736936200000 (verifying it parsed without crash)
        val expectedMillis = java.time.Instant.parse("2025-01-15T10:30:00Z").toEpochMilli()
        assertEquals(expectedMillis, entitySlot.captured.modifiedAt)
    }

    @Test
    fun `pull should parse ISO datetime with Z suffix correctly`() = runTest {
        val remoteRecord = ShiftModeSettingSyncRecord(
            id = "setting-with-z",
            enabled = false,
            modifiedAt = "2025-01-15T10:30:00Z",
            isDeleted = false,
        )

        coEvery { dao.getAll() } returns emptyList()
        coEvery { apiService.pull(any(), any()) } returns Response.success(
            GenericApiResponse(
                data = ShiftModeSettingSyncPullResponse(
                    records = listOf(remoteRecord),
                    cursor = null,
                    hasMore = false,
                )
            )
        )

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        val result = adapter.pull(null)

        assertTrue(result.success)
        val expectedMillis = java.time.Instant.parse("2025-01-15T10:30:00Z").toEpochMilli()
        assertEquals(expectedMillis, entitySlot.captured.modifiedAt)
    }

    @Test
    fun `pull should parse ISO datetime with offset correctly`() = runTest {
        val remoteRecord = ShiftModeSettingSyncRecord(
            id = "setting-offset",
            enabled = true,
            modifiedAt = "2025-01-15T10:30:00+02:00",
            isDeleted = false,
        )

        coEvery { dao.getAll() } returns emptyList()
        coEvery { apiService.pull(any(), any()) } returns Response.success(
            GenericApiResponse(
                data = ShiftModeSettingSyncPullResponse(
                    records = listOf(remoteRecord),
                    cursor = null,
                    hasMore = false,
                )
            )
        )

        val entitySlot = slot<ShiftModeSettingEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit

        val result = adapter.pull(null)

        assertTrue(result.success)
        // +02:00 means 10:30 local = 08:30 UTC
        val expectedMillis = java.time.Instant.parse("2025-01-15T08:30:00Z").toEpochMilli()
        assertEquals(expectedMillis, entitySlot.captured.modifiedAt)
    }
}
