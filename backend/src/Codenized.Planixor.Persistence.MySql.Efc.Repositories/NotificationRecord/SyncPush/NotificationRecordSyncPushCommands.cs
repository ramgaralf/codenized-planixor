// <copyright file="NotificationRecordSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.NotificationRecord.SyncPush;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Repository implementation for upserting notification records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class NotificationRecordSyncPushCommands : INotificationRecordSyncPushCommands, IAppServiceScoped
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
    /// Upserts a batch of notification records using last-writer-wins conflict resolution.
    /// For each record: if no existing record with the same Id exists, inserts it.
    /// If an existing record exists and the incoming modifiedAt is greater than or equal to
    /// the existing modifiedAt, the incoming record wins (remote wins on tie).
    /// Sets syncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="userId">The user identifier who owns the notification records.</param>
    /// <param name="records">The batch of notification record entities to upsert.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpsertAsync(string userId, IReadOnlyList<NotificationRecordEntity> records)
    {
        List<Guid> incomingIds = records.Select(r => r.Id).ToList();

        Dictionary<Guid, NotificationRecordEntity> existingRecords = await this.context.NotificationRecords
            .Where(n => n.UserId == userId && incomingIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id);

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

        await this.context.SaveChangesAsync();
    }
}
