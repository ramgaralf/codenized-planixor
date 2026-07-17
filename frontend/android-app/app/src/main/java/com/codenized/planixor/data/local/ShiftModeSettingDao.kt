package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for the shift mode setting.
 */
@Dao
interface ShiftModeSettingDao {

    @Query("SELECT * FROM shift_mode_settings WHERE isDeleted = 0 LIMIT 1")
    fun observe(): Flow<ShiftModeSettingEntity?>

    @Query("SELECT * FROM shift_mode_settings WHERE isDeleted = 0 LIMIT 1")
    suspend fun get(): ShiftModeSettingEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: ShiftModeSettingEntity)

    @Query("SELECT * FROM shift_mode_settings WHERE modifiedAt > syncedAt OR syncedAt IS NULL")
    suspend fun getUnsyncedRecords(): List<ShiftModeSettingEntity>

    @Query("SELECT * FROM shift_mode_settings")
    suspend fun getAll(): List<ShiftModeSettingEntity>

    @Query("DELETE FROM shift_mode_settings WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM shift_mode_settings WHERE id != :keepId")
    suspend fun deleteAllExcept(keepId: String)
}
