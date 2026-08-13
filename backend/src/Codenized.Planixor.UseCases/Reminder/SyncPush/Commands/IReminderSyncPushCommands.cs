// <copyright file="IReminderSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Defines write operations for reminder synchronization push.
/// </summary>
public interface IReminderSyncPushCommands
{
    /// <summary>
    /// Upserts a batch of reminder records using last-writer-wins conflict resolution.
    /// For each reminder: if no existing record with the same Id exists, inserts it.
    /// If an existing record exists and the incoming modifiedAt is greater than or equal to
    /// the existing modifiedAt, the incoming record wins (remote wins on tie).
    /// Sets syncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="userId">The user identifier who owns the reminders.</param>
    /// <param name="reminders">The batch of reminder entities to upsert.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>
    /// The number of records actually persisted. A record whose identifier already belongs to another account is
    /// skipped rather than written, so this can be lower than the batch size.
    /// </returns>
    Task<int> UpsertAsync(string userId, IReadOnlyList<Reminder> reminders, CancellationToken cancellationToken);
}
