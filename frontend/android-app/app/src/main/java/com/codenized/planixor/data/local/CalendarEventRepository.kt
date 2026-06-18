package com.codenized.planixor.data.local

import com.codenized.planixor.domain.validation.CalendarEventValidation
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
 * - Day range: endDay must be on or after startDay
 * - Time validation: for reminders where endDay == startDay, endTime > startTime
 * - Crossing midnight: for shifts where endTime < startTime, auto-sets endDay = startDay + 1
 * - One-shift-per-day: only one non-deleted shift event allowed per startDay
 * - TotalHours computation: shifts use shiftHoursWorked, reminders use day/time difference
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
     * Observes non-deleted events within a date range (inclusive) using range intersection.
     */
    fun getByDateRange(startDate: String, endDate: String): Flow<List<CalendarEventEntity>> {
        return calendarEventDao.getByDateRange(startDate, endDate)
    }

    /**
     * Observes non-deleted events for a specific day using range intersection.
     */
    fun getByDate(day: String): Flow<List<CalendarEventEntity>> {
        return calendarEventDao.getByDate(day)
    }

    /**
     * Returns non-deleted shift events for a specific startDay, excluding a given event ID.
     * Used for one-shift-per-day constraint checking.
     */
    suspend fun getShiftsForDate(startDay: String, excludeId: String = ""): List<CalendarEventEntity> {
        return calendarEventDao.getShiftsForDate(startDay, excludeId)
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
     * 1. Day range validation: endDay >= startDay
     * 2. Crossing midnight for shifts: auto-sets endDay = startDay + 1 if endTime < startTime
     * 3. Time validation for reminders: endTime > startTime when endDay == startDay
     * 4. One-shift-per-day constraint: no other non-deleted shift on the same startDay
     * 5. Computes totalHours based on event type rules
     *
     * On success, generates a UUID, sets modifiedAt to now, syncedAt to null, isDeleted to false.
     *
     * Validates: Requirements 1.1, 1.6, 2.1, 7.2, 11.5, 11.6, 11.7
     */
    suspend fun create(
        eventType: String,
        eventTypeId: String,
        startDay: String,
        endDay: String,
        startTime: Int,
        endTime: Int,
        notes: String?,
        shiftHoursWorked: Int? = null,
    ): CalendarEventResult {
        // For shift events, auto-compute endDay based on crossing midnight
        val computedEndDay = if (eventType == "shift") {
            CalendarEventValidation.computeEndDayForShift(startDay, startTime, endTime)
        } else {
            endDay
        }

        // Validate day range: endDay >= startDay
        if (!CalendarEventValidation.validateDayRange(startDay, computedEndDay)) {
            return CalendarEventResult.ValidationError("End day must be on or after start day")
        }

        // Validate time for reminders: endTime > startTime when endDay == startDay
        if (eventType == "reminder" &&
            !CalendarEventValidation.validateTimeForReminder(startDay, computedEndDay, startTime, endTime)
        ) {
            return CalendarEventResult.ValidationError("End time must be after start time for same-day reminders")
        }

        // Validate notes length
        if (!CalendarEventValidation.validateNotes(notes)) {
            return CalendarEventResult.ValidationError("Notes must not exceed $MAX_NOTES_LENGTH characters")
        }

        // Validate one-shift-per-day constraint using startDay
        if (eventType == "shift") {
            val existingShifts = calendarEventDao.getShiftsForDate(startDay)
            if (existingShifts.isNotEmpty()) {
                return CalendarEventResult.ValidationError("Only one shift per day is allowed")
            }
        }

        // Compute totalHours based on event type
        val totalHours = CalendarEventValidation.computeTotalHours(
            eventType, startDay, computedEndDay, startTime, endTime, shiftHoursWorked,
        )

        val now = System.currentTimeMillis()
        val entity = CalendarEventEntity(
            id = UUID.randomUUID().toString(),
            eventType = eventType,
            eventTypeId = eventTypeId,
            startDay = startDay,
            endDay = computedEndDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = totalHours,
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
     * 1. Day range validation: endDay >= startDay
     * 2. Crossing midnight for shifts: auto-sets endDay = startDay + 1 if endTime < startTime
     * 3. Time validation for reminders: endTime > startTime when endDay == startDay
     * 4. One-shift-per-day constraint (excludes the event being edited) using startDay
     * 5. Recomputes totalHours based on event type rules
     *
     * Sets modifiedAt to now and syncedAt to null on every update.
     *
     * Validates: Requirements 1.1, 1.6, 2.1, 7.2, 11.5, 11.6, 11.7
     */
    suspend fun update(
        id: String,
        eventType: String,
        eventTypeId: String,
        startDay: String,
        endDay: String,
        startTime: Int,
        endTime: Int,
        notes: String?,
        shiftHoursWorked: Int? = null,
    ): CalendarEventResult {
        val existing = calendarEventDao.getById(id)
            ?: return CalendarEventResult.ValidationError("Event not found")

        // For shift events, auto-compute endDay based on crossing midnight
        val computedEndDay = if (eventType == "shift") {
            CalendarEventValidation.computeEndDayForShift(startDay, startTime, endTime)
        } else {
            endDay
        }

        // Validate day range: endDay >= startDay
        if (!CalendarEventValidation.validateDayRange(startDay, computedEndDay)) {
            return CalendarEventResult.ValidationError("End day must be on or after start day")
        }

        // Validate time for reminders: endTime > startTime when endDay == startDay
        if (eventType == "reminder" &&
            !CalendarEventValidation.validateTimeForReminder(startDay, computedEndDay, startTime, endTime)
        ) {
            return CalendarEventResult.ValidationError("End time must be after start time for same-day reminders")
        }

        // Validate notes length
        if (!CalendarEventValidation.validateNotes(notes)) {
            return CalendarEventResult.ValidationError("Notes must not exceed $MAX_NOTES_LENGTH characters")
        }

        // Validate one-shift-per-day constraint (exclude self) using startDay
        if (eventType == "shift") {
            val existingShifts = calendarEventDao.getShiftsForDate(startDay, excludeId = id)
            if (existingShifts.isNotEmpty()) {
                return CalendarEventResult.ValidationError("Only one shift per day is allowed")
            }
        }

        // Recompute totalHours based on event type
        val totalHours = CalendarEventValidation.computeTotalHours(
            eventType, startDay, computedEndDay, startTime, endTime, shiftHoursWorked,
        )

        val updated = existing.copy(
            eventType = eventType,
            eventTypeId = eventTypeId,
            startDay = startDay,
            endDay = computedEndDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = totalHours,
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
        private const val MAX_NOTES_LENGTH = 250
    }
}
