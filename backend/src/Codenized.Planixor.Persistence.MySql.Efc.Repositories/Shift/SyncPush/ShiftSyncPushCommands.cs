// <copyright file="ShiftSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.Shift.SyncPush;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.Shift.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using ShiftEntity = Codenized.Planixor.Core.Entities.Shift;

/// <summary>
/// Repository implementation for upserting shift records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class ShiftSyncPushCommands : IShiftSyncPushCommands, IAppServiceScoped
{
    private readonly ApplicationWriteContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftSyncPushCommands"/> class.
    /// </summary>
    /// <param name="context">The application write context.</param>
    public ShiftSyncPushCommands(ApplicationWriteContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Upserts a batch of shift records using last-writer-wins conflict resolution.
    /// For each shift: if no existing record with the same Id exists, inserts it.
    /// If an existing record exists and the incoming modifiedAt is greater than or equal to
    /// the existing modifiedAt, the incoming record wins (remote wins on tie).
    /// Sets syncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="userId">The user identifier who owns the shifts.</param>
    /// <param name="shifts">The batch of shift entities to upsert.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpsertAsync(Guid userId, IReadOnlyList<ShiftEntity> shifts)
    {
        List<Guid> incomingIds = shifts.Select(s => s.Id).ToList();

        Dictionary<Guid, ShiftEntity> existingShifts = await this.context.Shifts
            .Where(s => s.UserId == userId && incomingIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id);

        foreach (ShiftEntity incoming in shifts)
        {
            if (existingShifts.TryGetValue(incoming.Id, out ShiftEntity? existing))
            {
                if (incoming.ModifiedAt >= existing.ModifiedAt)
                {
                    existing.ApplySync(
                        incoming.Name,
                        incoming.Icon,
                        incoming.BackgroundColor,
                        incoming.StartTime,
                        incoming.EndTime,
                        incoming.HoursWorked,
                        incoming.IsActive,
                        incoming.ModifiedAt,
                        incoming.IsDeleted);
                }
            }
            else
            {
                incoming.MarkSynced();
                this.context.Shifts.Add(incoming);
            }
        }

        await this.context.SaveChangesAsync();
    }
}
