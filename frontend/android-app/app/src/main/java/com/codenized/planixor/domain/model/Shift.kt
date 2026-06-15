package com.codenized.planixor.domain.model

/**
 * Domain model representing a work shift template.
 */
data class Shift(
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val startTime: Int,
    val endTime: Int,
    val hoursWorked: Int,
    val isActive: Boolean,
    val createdAt: Long,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
