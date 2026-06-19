package com.codenized.planixor.data.local

import com.codenized.planixor.domain.model.AnnualHoursConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository wrapping AnnualHoursConfigDao with business logic for
 * annual hours configuration CRUD operations.
 * Handles UUID generation, validation, system field management, and domain model mapping.
 */
@Singleton
class AnnualHoursConfigRepository @Inject constructor(
    private val dao: AnnualHoursConfigDao,
) {

    companion object {
        private const val MIN_YEAR = 2000
        private const val MAX_YEAR = 2100
        private const val MIN_CONFIGURED_HOURS = 1
        private const val MAX_CONFIGURED_HOURS = 8784
    }

    /**
     * Observes the non-deleted annual hours config for a given year,
     * mapped to domain model.
     */
    fun getByYear(year: Int): Flow<AnnualHoursConfig?> {
        return dao.getByYear(year).map { entity ->
            entity?.toDomain()
        }
    }

    /**
     * Saves (creates or updates) an annual hours config for the given year.
     * Validates year range (2000–2100) and configuredHours range (1–8784).
     * If a non-deleted record exists for the year, updates it preserving its ID.
     * If no record exists, creates a new one with a client-generated UUID.
     * Sets modifiedAt to current UTC timestamp and syncedAt to null.
     */
    suspend fun save(year: Int, configuredHours: Int): Result<Unit> {
        if (year < MIN_YEAR || year > MAX_YEAR) {
            return Result.failure(IllegalArgumentException("Year must be between $MIN_YEAR and $MAX_YEAR"))
        }
        if (configuredHours < MIN_CONFIGURED_HOURS || configuredHours > MAX_CONFIGURED_HOURS) {
            return Result.failure(IllegalArgumentException("Configured hours must be between $MIN_CONFIGURED_HOURS and $MAX_CONFIGURED_HOURS"))
        }

        val now = System.currentTimeMillis()
        val existing = dao.getByYearSync(year)

        if (existing != null) {
            val updated = existing.copy(
                configuredHours = configuredHours,
                modifiedAt = now,
                syncedAt = null,
            )
            dao.upsert(updated)
        } else {
            val entity = AnnualHoursConfigEntity(
                id = UUID.randomUUID().toString(),
                year = year,
                configuredHours = configuredHours,
                modifiedAt = now,
                syncedAt = null,
                isDeleted = false,
            )
            dao.upsert(entity)
        }

        return Result.success(Unit)
    }

    /**
     * Soft-deletes the annual hours config for the given year.
     * Sets isDeleted=true, modifiedAt=now, syncedAt=null.
     * If no non-deleted record exists for the year, returns success (no-op).
     */
    suspend fun softDelete(year: Int): Result<Unit> {
        val existing = dao.getByYearSync(year) ?: return Result.success(Unit)

        val deleted = existing.copy(
            isDeleted = true,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        dao.upsert(deleted)

        return Result.success(Unit)
    }

    /**
     * Returns all records pending synchronization (syncedAt is null or modifiedAt > syncedAt).
     */
    suspend fun getPendingSync(): List<AnnualHoursConfig> {
        return dao.getPendingSync().map { it.toDomain() }
    }

    /**
     * Returns a single record by its ID (regardless of isDeleted status).
     * Used by the sync adapter for conflict resolution during pull.
     */
    suspend fun getById(id: String): AnnualHoursConfig? {
        return dao.getById(id)?.toDomain()
    }

    /**
     * Bulk upserts records received from sync pull.
     * Used by the sync service to merge remote records into local store.
     */
    suspend fun upsertFromSync(records: List<AnnualHoursConfig>) {
        records.forEach { record ->
            val entity = AnnualHoursConfigEntity(
                id = record.id,
                year = record.year,
                configuredHours = record.configuredHours,
                modifiedAt = record.modifiedAt,
                syncedAt = record.syncedAt,
                isDeleted = record.isDeleted,
            )
            dao.upsert(entity)
        }
    }
}

/**
 * Maps AnnualHoursConfigEntity to AnnualHoursConfig domain model.
 */
private fun AnnualHoursConfigEntity.toDomain(): AnnualHoursConfig = AnnualHoursConfig(
    id = id,
    year = year,
    configuredHours = configuredHours,
    modifiedAt = modifiedAt,
    syncedAt = syncedAt,
    isDeleted = isDeleted,
)
