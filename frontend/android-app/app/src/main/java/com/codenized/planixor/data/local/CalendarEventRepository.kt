package com.codenized.planixor.data.local

import kotlinx.coroutines.flow.Flow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Result type for calendar event operations that may fail due to validation.
 */
sealed class CalendarEventResult {
    data class Success(val event: CalendarEventEntity) : CalendarEventResult()
    data class ValidationError(val message: String) : CalendarEventResult()
}

/**
 * Repository wrapping CalendarEventDao with business logic for calendar event CRUD operations.
 * Handles UUID generation, change tracking (modifiedAt/syncedAt), and dual validation:
 * - Time range: endTime must be strictly greater than startTime
 * - One-shift-per-day: only one non-deleted shift event allowed per calendar date
 */
/**
 * Data Isolation (Req 13.1, 13.2):
 * This repository operates exclusively on the local Room (SQLite) database.
 * Ownership is implicit — all records belong to the device's authenticated session.
 * No userId is stored per record; no remote/cross-user data is ever queried.
 * Sign-out/sign-in isolation (Req 13.5) is handled at the application level by
 * the auth module clearing or scoping the database on account switch.
 * Free (anonymous) users (Req 13.7) have sync inactive — this repository works
 * fully offline with no network dependency.
 */
@Singleton
class CalendarEventRepository @Inject constructor(
    private val calendarEventDao: CalendarEventDao,
) {

    /**
     * Observes non-deleted events within a date range (inclusive).
     */
    fun getByDateRange(startDate: String, endDate: String): Flow<List<CalendarEventEntity>> {
        return calendarEventDao.getByDateRange(startDate, endDate)
    }

    /**
     * Observes non-deleted events for a specific day.
     */
    fun getByDate(day: String): Flow<List<CalendarEventEntity>> {
        return calendarEventDao.getByDate(day)
    }

    /**
     * Returns non-deleted shift events for a specific day, excluding a given event ID.
     * Used for one-shift-per-day constraint checking.
     */
    suspend fun getShiftsForDate(day: String, excludeId: String = ""): List<CalendarEventEntity> {
        return calendarEventDao.getShiftsForDate(day, excludeId)
    }

    /**
     * Returns all unsynced events (syncedAt is null or modifiedAt > syncedAt).
     */
    suspend fun getUnsynced(): List<CalendarEventEntity> {
        return calendarEventDao.getUnsynced()
    }

    /**
     * Returns an event by ID, or null if not found.
     */
    suspend fun getById(id: String): CalendarEventEntity? {
        return calendarEventDao.getById(id)
    }

    /**
     * Creates a new calendar event with dual validation:
     * 1. Time range validation: endTime > startTime
     * 2. One-shift-per-day constraint: no other non-deleted shift on the same day
     *
     * On success, generates a UUID, sets modifiedAt to now, syncedAt to null, isDeleted to false.
     */
    suspend fun create(
        eventType: String,
        eventTypeId: String,
        day: String,
        startTime: Int,
        endTime: Int,
        notes: String?,
    ): CalendarEventResult {
        // Validate time range
        if (endTime <= startTime) {
            return CalendarEventResult.ValidationError("End time must be after start time")
        }

        // Validate one-shift-per-day constraint
        if (eventType == "shift") {
            val existingShifts = calendarEventDao.getShiftsForDate(day)
            if (existingShifts.isNotEmpty()) {
                return CalendarEventResult.ValidationError("Only one shift per day is allowed")
            }
        }

        val now = System.currentTimeMillis()
        val entity = CalendarEventEntity(
            id = UUID.randomUUID().toString(),
            eventType = eventType,
            eventTypeId = eventTypeId,
            day = day,
            startTime = startTime,
            endTime = endTime,
            notes = notes?.take(MAX_NOTES_LENGTH),
            modifiedAt = now,
            syncedAt = null,
            isDeleted = false,
        )
        calendarEventDao.insert(entity)
        return CalendarEventResult.Success(entity)
    }

    /**
     * Updates an existing calendar event with dual validation:
     * 1. Time range validation: endTime > startTime
     * 2. One-shift-per-day constraint (excludes the event being edited)
     *
     * Sets modifiedAt to now and syncedAt to null on every update.
     */
    suspend fun update(
        id: String,
        eventType: String,
        eventTypeId: String,
        day: String,
        startTime: Int,
        endTime: Int,
        notes: String?,
    ): CalendarEventResult {
        val existing = calendarEventDao.getById(id)
            ?: return CalendarEventResult.ValidationError("Event not found")

        // Validate time range
        if (endTime <= startTime) {
            return CalendarEventResult.ValidationError("End time must be after start time")
        }

        // Validate one-shift-per-day constraint (exclude self)
        if (eventType == "shift") {
            val existingShifts = calendarEventDao.getShiftsForDate(day, excludeId = id)
            if (existingShifts.isNotEmpty()) {
                return CalendarEventResult.ValidationError("Only one shift per day is allowed")
            }
        }

        val updated = existing.copy(
            eventType = eventType,
            eventTypeId = eventTypeId,
            day = day,
            startTime = startTime,
            endTime = endTime,
            notes = notes?.take(MAX_NOTES_LENGTH),
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        calendarEventDao.update(updated)
        return CalendarEventResult.Success(updated)
    }

    /**
     * Soft-deletes an event: sets isDeleted = true, modifiedAt = now, syncedAt = null.
     */
    suspend fun softDelete(id: String): CalendarEventResult {
        val existing = calendarEventDao.getById(id)
            ?: return CalendarEventResult.ValidationError("Event not found")

        val deleted = existing.copy(
            isDeleted = true,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        calendarEventDao.update(deleted)
        return CalendarEventResult.Success(deleted)
    }

    companion object {
        private const val MAX_NOTES_LENGTH = 200
    }
}
