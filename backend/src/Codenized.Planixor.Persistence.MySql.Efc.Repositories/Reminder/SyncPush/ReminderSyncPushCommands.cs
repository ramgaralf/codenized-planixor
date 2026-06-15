// <copyright file="ReminderSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.Reminder.SyncPush;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using ReminderEntity = Codenized.Planixor.Core.Entities.Reminder;

/// <summary>
/// Repository implementation for upserting reminder records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class ReminderSyncPushCommands : IReminderSyncPushCommands, IAppServiceScoped
{
    private readonly ApplicationWriteContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ReminderSyncPushCommands"/> class.
    /// </summary>
    /// <param name="context">The application write context.</param>
    public ReminderSyncPushCommands(ApplicationWriteContext context)
    {
        this.context = context;
    }

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
    public async Task UpsertAsync(Guid userId, IReadOnlyList<ReminderEntity> reminders)
    {
        List<Guid> incomingIds = reminders.Select(r => r.Id).ToList();

        Dictionary<Guid, ReminderEntity> existingReminders = await this.context.Reminders
            .Where(r => r.UserId == userId && incomingIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id);

        foreach (ReminderEntity incoming in reminders)
        {
            if (existingReminders.TryGetValue(incoming.Id, out ReminderEntity? existing))
            {
                if (incoming.ModifiedAt >= existing.ModifiedAt)
                {
                    existing.ApplySync(
                        incoming.Name,
                        incoming.Icon,
                        incoming.BackgroundColor,
                        incoming.IsActive,
                        incoming.ModifiedAt,
                        incoming.IsDeleted);
                }
            }
            else
            {
                incoming.MarkSynced();
                this.context.Reminders.Add(incoming);
            }
        }

        await this.context.SaveChangesAsync();
    }
}
