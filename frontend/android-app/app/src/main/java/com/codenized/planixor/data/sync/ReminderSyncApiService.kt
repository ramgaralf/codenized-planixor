package com.codenized.planixor.data.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Sync DTO for reminder records sent/received over the wire.
 * Dates serialized as ISO 8601 strings; syncedAt is never transmitted.
 */
data class ReminderSyncRecord(
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val isActive: Boolean,
    val seriesFrequency: String = "never",
    val seriesEndDate: String = "",
    val createdAt: String,
    val modifiedAt: String,
    val isDeleted: Boolean,
)

/**
 * Request body for pushing reminder records to the API.
 */
data class ReminderSyncPushRequest(
    val records: List<ReminderSyncRecord>,
)

/**
 * API response after pushing reminder records.
 */
data class ReminderSyncPushResponse(
    val syncedCount: Int,
)

/**
 * API response when pulling reminder records.
 */
data class ReminderSyncPullResponse(
    val records: List<ReminderSyncRecord>,
    val cursor: String?,
    val hasMore: Boolean,
)

/**
 * Retrofit interface for reminder sync endpoints.
 */
interface ReminderSyncApiService {

    @POST("api/reminders/sync/push")
    suspend fun push(@Body request: ReminderSyncPushRequest): Response<GenericApiResponse<ReminderSyncPushResponse>>

    @GET("api/reminders/sync/pull")
    suspend fun pull(
        @Query("lastSyncedAt") lastSyncedAt: String?,
        @Query("cursor") cursor: String?,
    ): Response<GenericApiResponse<ReminderSyncPullResponse>>
}
