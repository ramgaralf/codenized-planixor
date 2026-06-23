package com.codenized.planixor.data.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Sync DTO for annual hours config records sent/received over the wire.
 * Dates serialized as ISO strings; maps to the backend sync endpoints.
 */
data class AnnualHoursConfigSyncRecord(
    val id: String,
    val year: Int,
    val configuredHours: Int,
    val modifiedAt: String,
    val syncedAt: String?,
    val isDeleted: Boolean,
)

/**
 * Request body for pushing annual hours config records to the API.
 */
data class AnnualHoursConfigSyncPushRequest(
    val records: List<AnnualHoursConfigSyncRecord>,
)

/**
 * API response after pushing annual hours config records.
 * Returns the count of records successfully processed.
 */
data class AnnualHoursConfigSyncPushResponse(
    val processedCount: Int,
)

/**
 * API response when pulling annual hours config records.
 */
data class AnnualHoursConfigSyncPullResponse(
    val records: List<AnnualHoursConfigSyncRecord>,
    val nextCursor: String?,
)

/**
 * Retrofit interface for annual hours config sync endpoints.
 */
interface AnnualHoursConfigSyncApiService {

    @POST("api/annual-hours-config/sync/push")
    suspend fun push(@Body request: AnnualHoursConfigSyncPushRequest): Response<GenericApiResponse<AnnualHoursConfigSyncPushResponse>>

    @GET("api/annual-hours-config/sync/pull")
    suspend fun pull(
        @Query("lastSyncedAt") lastSyncedAt: String?,
        @Query("cursor") cursor: String?,
    ): Response<GenericApiResponse<AnnualHoursConfigSyncPullResponse>>
}
