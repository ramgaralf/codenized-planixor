// <copyright file="NotificationRecordSyncRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

/// <summary>
/// Represents a single notification record in a sync payload (both push and pull).
/// </summary>
/// <param name="Id">The notification record identifier.</param>
/// <param name="CalendarEventId">The identifier of the referenced calendar event.</param>
/// <param name="AlertOffset">Minutes before event start (0, 10, 60, or 1440).</param>
/// <param name="TriggerTime">The computed trigger time (UTC).</param>
/// <param name="IsDelivered">Whether the notification has been delivered.</param>
/// <param name="IsRead">Whether the user has read/dismissed the notification.</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="IsDeleted">Whether the record is soft-deleted.</param>
public record NotificationRecordSyncRecord(
    Guid Id,
    Guid CalendarEventId,
    int AlertOffset,
    DateTime TriggerTime,
    bool IsDelivered,
    bool IsRead,
    DateTime ModifiedAt,
    bool IsDeleted);
