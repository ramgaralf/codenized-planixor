// <copyright file="NotificationRecordSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.NotificationRecord.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Core.Entities;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Repository implementation for upserting notification records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class NotificationRecordSyncPushCommands : INotificationRecordSyncPushCommands, IRepository
{
    private readonly ApplicationWriteContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncPushCommands"/> class.
    /// </summary>
    /// <param name="context">The application write context.</param>
    public NotificationRecordSyncPushCommands(ApplicationWriteContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Purges past notification records for the specified user.
    /// Identifies and permanently deletes (hard delete) all NotificationRecord entities
    /// whose associated CalendarEvent has an EndDay strictly before the current UTC date,
    /// or whose associated CalendarEvent does not exist (orphaned records).
    /// Only records belonging to the specified user are affected.
    /// </summary>
    /// <param name="userId">The user identifier whose past records should be purged.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task PurgePastRecordsAsync(string userId, CancellationToken cancellationToken)
    {
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);

        // An anti-join, evaluated by the database: purge a record unless the user still owns a calendar event with
        // that identifier whose EndDay has not passed. That covers both cases the previous version handled — an
        // orphaned record whose event is gone, and one whose event is in the past.
        //
        // It used to load every notification record and every calendar event the user owns, in full, on every push,
        // and match them in a dictionary: two complete partition scans before any batch size limit could apply.
        List<NotificationRecordEntity> recordsToPurge = await this.context.NotificationRecords
            .Where(n => n.UserId == userId)
            .Where(n => !this.context.CalendarEvents.Any(ce =>
                ce.UserId == userId && ce.Id == n.CalendarEventId && ce.EndDay >= today))
            .ToListAsync(cancellationToken);

        if (recordsToPurge.Count == 0)
        {
            return;
        }

        // Queued, not committed. The single SaveChanges at the end of the push writes these deletions together with
        // the incoming records, so a failure part-way through leaves neither applied. This used to commit on its
        // own: when the upsert then failed, the deletions were already permanent while the client — believing the
        // push had failed — retried, and the purged rows existed on neither side.
        this.context.NotificationRecords.RemoveRange(recordsToPurge);
    }

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
    public async Task UpsertAsync(string userId, IReadOnlyList<NotificationRecordEntity> records, CancellationToken cancellationToken)
    {
        if (records == null || records.Count == 0)
        {
            return;
        }

        List<Guid> incomingIds = records.Select(r => r.Id).ToList();

        // Tracked on purpose: ApplySync mutates the loaded entities and relies on change tracking to persist them.
        // One query instead of a FirstOrDefaultAsync per record, which was a round trip per element of the batch
        // with the connection held for all of them.
        Dictionary<Guid, NotificationRecordEntity> existingRecords = await this.context.NotificationRecords
            .Where(n => n.UserId == userId)
            .Where(EntityIdFilter.IdIn<NotificationRecordEntity>(incomingIds))
            .ToDictionaryAsync(n => n.Id, cancellationToken);

        foreach (NotificationRecordEntity incoming in records)
        {
            if (existingRecords.TryGetValue(incoming.Id, out NotificationRecordEntity? existing))
            {
                if (incoming.ModifiedAt >= existing.ModifiedAt)
                {
                    existing.ApplySync(
                        incoming.CalendarEventId,
                        incoming.AlertOffset,
                        incoming.TriggerTime,
                        incoming.IsDelivered,
                        incoming.IsRead,
                        incoming.ModifiedAt,
                        incoming.IsDeleted);
                }
            }
            else
            {
                incoming.MarkSynced();
                this.context.NotificationRecords.Add(incoming);
            }
        }
    }

    /// <summary>
    /// Commits everything the push has queued — the purged records and the incoming ones — in one go.
    /// </summary>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// The purge and the upsert used to commit separately, so a failure in the second left the first applied. They
    /// now share this single commit, which the caller must invoke even when the batch had nothing to insert —
    /// otherwise a push that only purges would never write anything.
    /// </remarks>
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        this.context.SaveChangesAsync(cancellationToken);
}
