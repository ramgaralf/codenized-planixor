package com.codenized.planixor.data.local

import android.util.Log
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for shift mode setting operations.
 * Manages the single-row shift mode entity with create-on-first-access semantics.
 *
 * Includes startup deduplication: if multiple records exist (due to a previous sync bug),
 * only the most recently modified record is kept.
 */
@Singleton
class ShiftModeSettingRepository @Inject constructor(
    private val dao: ShiftModeSettingDao,
) {

    companion object {
        private const val TAG = "ShiftModeSettingRepo"
    }

    /**
     * Observes the shift mode enabled state as a reactive Flow.
     * Creates a default record (enabled=false) on first access if none exists.
     * Also performs deduplication on first access to clean up corrupt state.
     */
    fun observeEnabled(): Flow<Boolean> {
        return dao.observe()
            .onStart {
                deduplicate()
                getOrCreate()
            }
            .map { entity -> entity?.enabled ?: false }
    }

    /**
     * Toggles the shift mode enabled state.
     * Flips enabled, updates modifiedAt, and sets syncedAt=null to mark as pending sync.
     */
    suspend fun toggle() {
        val current = getOrCreate()
        val updated = current.copy(
            enabled = !current.enabled,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        dao.upsert(updated)
    }

    /**
     * Deduplicates ShiftModeSetting records.
     * Keeps only the most recently modified record and deletes the rest.
     * Safe to call at startup — it's a no-op when 0 or 1 records exist.
     */
    private suspend fun deduplicate() {
        try {
            val allRecords = dao.getAll()
            if (allRecords.size <= 1) return

            val keep = allRecords.maxByOrNull { it.modifiedAt } ?: return
            dao.deleteAllExcept(keep.id)
            Log.d(TAG, "Deduplicated shift mode settings: removed ${allRecords.size - 1} duplicate(s)")
        } catch (e: Exception) {
            Log.e(TAG, "ShiftModeSetting deduplication failed", e)
        }
    }

    /**
     * Ensures a shift mode setting record exists, creating a default one if needed.
     */
    private suspend fun getOrCreate(): ShiftModeSettingEntity {
        return dao.get() ?: createDefault()
    }

    private suspend fun createDefault(): ShiftModeSettingEntity {
        val entity = ShiftModeSettingEntity(
            id = UUID.randomUUID().toString(),
            enabled = false,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
            isDeleted = false,
        )
        dao.upsert(entity)
        return entity
    }
}
