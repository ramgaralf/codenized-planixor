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
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpsertAsync(string userId, IReadOnlyList<NotificationRecord> records, CancellationToken cancellationToken);

    /// <summary>
    /// Queues the deletion of past notification records for the specified user.
    /// Marks for deletion every NotificationRecord whose associated CalendarEvent has an EndDay strictly before the
    /// current UTC date, or whose associated CalendarEvent does not exist (orphaned records).
    /// Only records belonging to the specified user are affected.
    /// </summary>
    /// <param name="userId">The user identifier whose past records should be purged.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>Nothing is written until <see cref="SaveChangesAsync"/> is called.</remarks>
    Task PurgePastRecordsAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Commits everything the push has queued.
    /// </summary>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// <see cref="PurgePastRecordsAsync"/> and <see cref="UpsertAsync"/> only stage their work; this is what writes
    /// it, so the deletions and the incoming records land together or not at all. Call it even when the batch had
    /// nothing to insert, or a push that only purges would never write anything.
    /// </remarks>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
