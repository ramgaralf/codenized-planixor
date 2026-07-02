// <copyright file="NotificationRecordSyncPushResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

/// <summary>
/// Represents a rejected notification record with the rejection reason.
/// </summary>
/// <param name="Id">The identifier of the rejected record.</param>
/// <param name="Reason">The reason the record was rejected.</param>
public record NotificationRecordRejectedRecord(Guid Id, string Reason);

/// <summary>
/// Response payload for a notification record sync push operation.
/// </summary>
/// <param name="AcknowledgedIds">The identifiers of records successfully persisted.</param>
/// <param name="RejectedIds">The records that were rejected with reasons.</param>
public record NotificationRecordSyncPushResponse(
    List<Guid> AcknowledgedIds,
    List<NotificationRecordRejectedRecord> RejectedIds);
