package com.codenized.planixor.data.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Sync DTO for notification records sent/received over the wire.
 * Dates serialized as ISO 8601 strings; syncedAt is never transmitted.
 */
data class NotificationRecordSyncRecord(
    val id: String,
    val calendarEventId: String,
    val alertOffset: Int,
    val triggerTime: String,
    val isDelivered: Boolean,
    val isRead: Boolean,
    val modifiedAt: String,
    val isDeleted: Boolean,
)

/**
 * Request body for pushing notification records to the API.
 */
data class NotificationRecordSyncPushRequest(
    val records: List<NotificationRecordSyncRecord>,
)

/**
 * API response after pushing notification records.
 */
data class NotificationRecordSyncPushResponse(
    val acknowledgedIds: List<String>,
    val rejectedIds: List<RejectedRecord>,
)

/**
 * API response when pulling notification records.
 */
data class NotificationRecordSyncPullResponse(
    val records: List<NotificationRecordSyncRecord>,
    val cursor: String?,
)

/**
 * Retrofit interface for notification record sync endpoints.
 */
interface NotificationRecordSyncApiService {

    @POST("api/notification-records/sync/push")
    suspend fun push(@Body request: NotificationRecordSyncPushRequest): Response<GenericApiResponse<NotificationRecordSyncPushResponse>>

    @GET("api/notification-records/sync/pull")
    suspend fun pull(
        @Query("lastSyncedAt") lastSyncedAt: String?,
        @Query("cursor") cursor: String?,
    ): Response<GenericApiResponse<NotificationRecordSyncPullResponse>>
}
