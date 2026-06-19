package com.codenized.planixor.domain.model

/**
 * Domain model representing annual hours configuration.
 * Stores the configured required working hours for a specific year.
 */
data class AnnualHoursConfig(
    val id: String,
    val year: Int,
    val configuredHours: Int,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
