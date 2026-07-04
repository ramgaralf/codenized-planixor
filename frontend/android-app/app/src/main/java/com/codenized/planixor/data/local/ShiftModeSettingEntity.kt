package com.codenized.planixor.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing the shift mode setting stored locally.
 * Only one record exists per device (single-row entity pattern).
 * All fields follow the offline-first sync strategy with change tracking.
 */
@Entity(tableName = "shift_mode_settings")
data class ShiftModeSettingEntity(
    @PrimaryKey
    val id: String,
    val enabled: Boolean,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
