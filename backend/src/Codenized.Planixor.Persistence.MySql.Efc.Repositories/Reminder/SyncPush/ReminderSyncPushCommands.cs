// <copyright file="ReminderSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.Reminder.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using ReminderEntity = Codenized.Planixor.Core.Entities.Reminder;

/// <summary>
/// Repository implementation for upserting reminder records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class ReminderSyncPushCommands : IReminderSyncPushCommands, IRepository
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
    public async Task UpsertAsync(string userId, IReadOnlyList<ReminderEntity> reminders)
    {
        if (reminders == null || reminders.Count == 0)
        {
            return;
        }

        // Workaround for EF Core 10 + MySQL provider: load tracked entities individually
        var existingReminders = new Dictionary<Guid, ReminderEntity>();

        foreach (ReminderEntity incoming in reminders)
        {
            ReminderEntity? existing = await this.context.Reminders
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Id == incoming.Id);

            if (existing != null)
            {
                existingReminders[incoming.Id] = existing;
            }
        }

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
                        incoming.SeriesFrequency,
                        incoming.SeriesEndDate,
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
