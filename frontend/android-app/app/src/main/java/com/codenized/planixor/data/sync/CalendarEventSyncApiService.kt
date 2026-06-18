package com.codenized.planixor.data.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Sync DTO for calendar event records sent/received over the wire.
 * Dates serialized as ISO strings; syncedAt is never transmitted.
 */
data class CalendarEventSyncRecord(
    val id: String,
    val eventType: String,
    val eventTypeId: String,
    val startDay: String,
    val endDay: String,
    val startTime: Int,
    val endTime: Int,
    val totalHours: Int,
    val notes: String?,
    val modifiedAt: String,
    val isDeleted: Boolean,
)

/**
 * Request body for pushing calendar event records to the API.
 */
data class CalendarEventSyncPushRequest(
    val records: List<CalendarEventSyncRecord>,
)

/**
 * API response after pushing calendar event records.
 */
data class CalendarEventSyncPushResponse(
    val acknowledgedIds: List<String>,
    val rejectedIds: List<RejectedRecord>,
)

/**
 * Represents a record rejected by the API during push.
 */
data class RejectedRecord(
    val id: String,
    val reason: String,
)

/**
 * API response when pulling calendar event records.
 */
data class CalendarEventSyncPullResponse(
    val records: List<CalendarEventSyncRecord>,
    val cursor: String?,
)

/**
 * Retrofit interface for calendar event sync endpoints.
 */
interface CalendarEventSyncApiService {

    @POST("api/v1/calendar-events/sync/push")
    suspend fun push(@Body request: CalendarEventSyncPushRequest): Response<CalendarEventSyncPushResponse>

    @GET("api/v1/calendar-events/sync/pull")
    suspend fun pull(
        @Query("lastSyncedAt") lastSyncedAt: String?,
        @Query("cursor") cursor: String?,
    ): Response<CalendarEventSyncPullResponse>
}
