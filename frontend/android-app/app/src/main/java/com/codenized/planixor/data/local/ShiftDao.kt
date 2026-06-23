package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for shifts.
 */
@Dao
interface ShiftDao {

    @Query("SELECT * FROM shifts WHERE isDeleted = 0 ORDER BY createdAt ASC")
    fun getAllActive(): Flow<List<ShiftEntity>>

    @Query("SELECT * FROM shifts WHERE id = :id")
    suspend fun getById(id: String): ShiftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(shift: ShiftEntity)

    @Query("UPDATE shifts SET isDeleted = 1, modifiedAt = :now, syncedAt = NULL WHERE id = :id")
    suspend fun softDelete(id: String, now: Long)

    @Query("UPDATE shifts SET isActive = :isActive, modifiedAt = :now WHERE id = :id")
    suspend fun setActive(id: String, isActive: Boolean, now: Long)

    /**
     * Returns all shifts that need to be pushed to the remote server.
     * A shift is unsynced if syncedAt is null or modifiedAt > syncedAt.
     */
    @Query("SELECT * FROM shifts WHERE syncedAt IS NULL OR modifiedAt > syncedAt")
    suspend fun getUnsynced(): List<ShiftEntity>

    /**
     * Returns all shifts including soft-deleted ones. Used for sync merging.
     */
    @Query("SELECT * FROM shifts")
    suspend fun getAll(): List<ShiftEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(shifts: List<ShiftEntity>)
}
