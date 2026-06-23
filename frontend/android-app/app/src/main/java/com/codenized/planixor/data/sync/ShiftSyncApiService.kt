package com.codenized.planixor.data.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Sync DTO for shift records sent/received over the wire.
 * Dates serialized as ISO 8601 strings; syncedAt is never transmitted.
 */
data class ShiftSyncRecord(
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val startTime: Int,
    val endTime: Int,
    val hoursWorked: Int,
    val isActive: Boolean,
    val createdAt: String,
    val modifiedAt: String,
    val isDeleted: Boolean,
)

/**
 * Request body for pushing shift records to the API.
 */
data class ShiftSyncPushRequest(
    val shifts: List<ShiftSyncRecord>,
)

/**
 * API response after pushing shift records.
 */
data class ShiftSyncPushResponse(
    val syncedCount: Int,
)

/**
 * API response when pulling shift records.
 */
data class ShiftSyncPullResponse(
    val shifts: List<ShiftSyncRecord>,
    val cursor: String?,
    val hasMore: Boolean,
)

/**
 * Retrofit interface for shift sync endpoints.
 */
interface ShiftSyncApiService {

    @POST("api/shifts/sync/push")
    suspend fun push(@Body request: ShiftSyncPushRequest): Response<GenericApiResponse<ShiftSyncPushResponse>>

    @GET("api/shifts/sync/pull")
    suspend fun pull(
        @Query("lastSyncedAt") lastSyncedAt: String?,
        @Query("cursor") cursor: String?,
    ): Response<GenericApiResponse<ShiftSyncPullResponse>>
}
