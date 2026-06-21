// <copyright file="INotificationRecordSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Commands;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Defines write operations for notification record synchronization push.
/// </summary>
public interface INotificationRecordSyncPushCommands
{
    /// <summary>
    /// Upserts a batch of notification records using last-writer-wins conflict resolution.
    /// For each record: if no existing record with the same Id exists, inserts it.
    /// If an existing record exists and the incoming modifiedAt is greater than or equal to
    /// the existing modifiedAt, the incoming record wins (remote wins on tie).
    /// Sets syncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="userId">The user identifier who owns the notification records.</param>
    /// <param name="records">The batch of notification record entities to upsert.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpsertAsync(string userId, IReadOnlyList<NotificationRecord> records);
}
