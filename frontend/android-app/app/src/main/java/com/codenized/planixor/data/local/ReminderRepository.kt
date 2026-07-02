package com.codenized.planixor.data.local

import com.codenized.planixor.domain.model.Reminder
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository wrapping ReminderDao with business logic for reminder CRUD operations.
 * Handles UUID generation, system field management, and domain model mapping.
 */
@Singleton
class ReminderRepository @Inject constructor(
    private val reminderDao: ReminderDao,
) {

    /**
     * Observes all non-deleted reminders, mapped to domain models.
     * Ordered by createdAt ASC (oldest first).
     */
    fun getAllActive(): Flow<List<Reminder>> {
        return reminderDao.getAllActive().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    /**
     * Creates a new reminder with client-generated UUID and system fields.
     * Duplicate names are permitted — no uniqueness check.
     */
    suspend fun create(
        name: String,
        icon: String,
        backgroundColor: String,
    ): Reminder {
        val now = System.currentTimeMillis()
        val entity = ReminderEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            icon = icon,
            backgroundColor = backgroundColor,
            isActive = true,
            createdAt = now,
            modifiedAt = now,
            syncedAt = null,
            isDeleted = false,
        )
        reminderDao.upsert(entity)
        return entity.toDomain()
    }

    /**
     * Updates an existing reminder preserving id, syncedAt, and isDeleted.
     * Sets modifiedAt to current timestamp.
     */
    suspend fun update(
        id: String,
        name: String,
        icon: String,
        backgroundColor: String,
    ) {
        val existing = reminderDao.getById(id) ?: return
        val updated = existing.copy(
            name = name,
            icon = icon,
            backgroundColor = backgroundColor,
            modifiedAt = System.currentTimeMillis(),
        )
        reminderDao.upsert(updated)
    }

    /**
     * Soft-deletes a reminder: sets isDeleted = true, syncedAt = null, modifiedAt = now.
     */
    suspend fun softDelete(id: String) {
        reminderDao.softDelete(id, System.currentTimeMillis())
    }

    /**
     * Deactivates a reminder: sets isActive = false, modifiedAt = now.
     */
    suspend fun deactivate(id: String) {
        reminderDao.setActive(id, false, System.currentTimeMillis())
    }

    /**
     * Activates a reminder: sets isActive = true, modifiedAt = now.
     */
    suspend fun activate(id: String) {
        reminderDao.setActive(id, true, System.currentTimeMillis())
    }

    /**
     * Retrieves a single reminder by ID, mapped to domain model.
     */
    suspend fun getById(id: String): Reminder? {
        return reminderDao.getById(id)?.toDomain()
    }

    /**
     * Retrieves all active, non-deleted reminders for calendar event selection.
     * Only reminders with isActive=true are included — deactivated reminders
     * are excluded from the selectable list during calendar event creation.
     * Ordered by createdAt ASC (oldest first).
     */
    fun getActiveForCalendarSelection(): Flow<List<Reminder>> {
        return reminderDao.getActiveForCalendarSelection().map { entities ->
            entities.map { it.toDomain() }
        }
    }
}

/**
 * Maps ReminderEntity to Reminder domain model.
 */
private fun ReminderEntity.toDomain(): Reminder = Reminder(
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
