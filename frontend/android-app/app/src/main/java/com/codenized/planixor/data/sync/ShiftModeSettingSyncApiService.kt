package com.codenized.planixor.data.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Sync DTO for shift mode setting records sent/received over the wire.
 * Dates serialized as ISO 8601 strings; syncedAt is never transmitted.
 */
data class ShiftModeSettingSyncRecord(
    val id: String,
    val enabled: Boolean,
    val modifiedAt: String,
    val isDeleted: Boolean,
)

/**
 * Request body for pushing shift mode setting records to the API.
 */
data class ShiftModeSettingSyncPushRequest(
    val records: List<ShiftModeSettingSyncRecord>,
)

/**
 * API response after pushing shift mode setting records.
 */
data class ShiftModeSettingSyncPushResponse(
    val syncedCount: Int,
)

/**
 * API response when pulling shift mode setting records.
 */
data class ShiftModeSettingSyncPullResponse(
    val records: List<ShiftModeSettingSyncRecord>,
    val cursor: String?,
    val hasMore: Boolean,
)

/**
 * Retrofit interface for shift mode setting sync endpoints.
 */
interface ShiftModeSettingSyncApiService {

    @POST("api/shift-mode-settings/sync/push")
    suspend fun push(@Body request: ShiftModeSettingSyncPushRequest): Response<GenericApiResponse<ShiftModeSettingSyncPushResponse>>

    @GET("api/shift-mode-settings/sync/pull")
    suspend fun pull(
        @Query("lastSyncedAt") lastSyncedAt: String?,
        @Query("cursor") cursor: String?,
    ): Response<GenericApiResponse<ShiftModeSettingSyncPullResponse>>
}
