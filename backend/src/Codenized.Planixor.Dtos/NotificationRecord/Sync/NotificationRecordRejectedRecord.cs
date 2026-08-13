// <copyright file="NotificationRecordRejectedRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

/// <summary>
/// Represents a rejected notification record with the rejection reason.
/// </summary>
/// <param name="Id">The identifier of the rejected record.</param>
/// <param name="Reason">The reason the record was rejected.</param>
public record NotificationRecordRejectedRecord(Guid Id, string Reason);
