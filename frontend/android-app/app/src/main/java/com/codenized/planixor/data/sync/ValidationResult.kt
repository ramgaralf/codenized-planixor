package com.codenized.planixor.data.sync

/**
 * Result of validating sync server credentials.
 */
data class ValidationResult(
    val success: Boolean,
    val username: String? = null,
    val error: String? = null,
)
