package com.codenized.planixor.data.sync

/**
 * Generic wrapper for all API responses following the backend's GenericResponse pattern.
 * The backend only returns "data" and "traceId" — success/message are not included.
 */
data class GenericApiResponse<T>(
    val data: T? = null,
    val traceId: String? = null,
)
