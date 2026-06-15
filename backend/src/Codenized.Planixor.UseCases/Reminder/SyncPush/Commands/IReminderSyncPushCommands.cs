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
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpsertAsync(Guid userId, IReadOnlyList<Reminder> reminders);
}
