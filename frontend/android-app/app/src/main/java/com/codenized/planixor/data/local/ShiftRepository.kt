package com.codenized.planixor.data.local

import com.codenized.planixor.domain.model.Shift
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository wrapping ShiftDao with business logic for shift CRUD operations.
 * Handles UUID generation, system field management, and domain model mapping.
 */
@Singleton
class ShiftRepository @Inject constructor(
    private val shiftDao: ShiftDao,
) {

    /**
     * Observes all non-deleted shifts, mapped to domain models.
     */
    fun getAllActive(): Flow<List<Shift>> {
        return shiftDao.getAllActive().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    /**
     * Creates a new shift with client-generated UUID and system fields.
     * Duplicate names are permitted — no uniqueness check.
     */
    suspend fun create(
        name: String,
        icon: String,
        backgroundColor: String,
        startTime: Int,
        endTime: Int,
        hoursWorked: Int,
    ): Shift {
        val now = System.currentTimeMillis()
        val entity = ShiftEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            icon = icon,
            backgroundColor = backgroundColor,
            startTime = startTime,
            endTime = endTime,
            hoursWorked = hoursWorked,
            isActive = true,
            createdAt = now,
            modifiedAt = now,
            syncedAt = null,
            isDeleted = false,
        )
        shiftDao.upsert(entity)
        return entity.toDomain()
    }

    /**
     * Updates an existing shift preserving id, syncedAt, and isDeleted.
     * Sets modifiedAt to current timestamp.
     */
    suspend fun update(
        id: String,
        name: String,
        icon: String,
        backgroundColor: String,
        startTime: Int,
        endTime: Int,
        hoursWorked: Int,
    ) {
        val existing = shiftDao.getById(id) ?: return
        val updated = existing.copy(
            name = name,
            icon = icon,
            backgroundColor = backgroundColor,
            startTime = startTime,
            endTime = endTime,
            hoursWorked = hoursWorked,
            modifiedAt = System.currentTimeMillis(),
        )
        shiftDao.upsert(updated)
    }

    /**
     * Soft-deletes a shift: sets isDeleted = true, syncedAt = null, modifiedAt = now.
     */
    suspend fun softDelete(id: String) {
        shiftDao.softDelete(id, System.currentTimeMillis())
    }

    /**
     * Toggles the isActive flag and updates modifiedAt.
     */
    suspend fun toggleActive(id: String) {
        val existing = shiftDao.getById(id) ?: return
        shiftDao.setActive(id, !existing.isActive, System.currentTimeMillis())
    }

    /**
     * Retrieves a single shift by ID, mapped to domain model.
     */
    suspend fun getById(id: String): Shift? {
        return shiftDao.getById(id)?.toDomain()
    }
}

/**
 * Maps ShiftEntity to Shift domain model.
 */
private fun ShiftEntity.toDomain(): Shift = Shift(
    id = id,
    name = name,
    icon = icon,
    backgroundColor = backgroundColor,
    startTime = startTime,
    endTime = endTime,
    hoursWorked = hoursWorked,
    isActive = isActive,
    createdAt = createdAt,
    modifiedAt = modifiedAt,
    syncedAt = syncedAt,
    isDeleted = isDeleted,
)
