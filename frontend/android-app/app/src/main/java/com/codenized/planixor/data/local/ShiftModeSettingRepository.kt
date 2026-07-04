package com.codenized.planixor.data.local

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.first
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for shift mode setting operations.
 * Manages the single-row shift mode entity with create-on-first-access semantics.
 */
@Singleton
class ShiftModeSettingRepository @Inject constructor(
    private val dao: ShiftModeSettingDao,
) {

    /**
     * Observes the shift mode enabled state as a reactive Flow.
     * Creates a default record (enabled=false) on first access if none exists.
     */
    fun observeEnabled(): Flow<Boolean> {
        return dao.observe()
            .onStart { getOrCreate() }
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
