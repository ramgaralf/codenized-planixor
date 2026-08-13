// <copyright file="ShiftSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.Shift.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.Shift.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using ShiftEntity = Codenized.Planixor.Core.Entities.Shift;

/// <summary>
/// Repository implementation for upserting shift records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class ShiftSyncPushCommands : IShiftSyncPushCommands, IRepository
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
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task<int> UpsertAsync(string userId, IReadOnlyList<ShiftEntity> shifts, CancellationToken cancellationToken)
    {
        if (shifts == null || shifts.Count == 0)
        {
            return 0;
        }

        List<Guid> incomingIds = shifts.Select(x => x.Id).ToList();

        // Tracked on purpose: ApplySync mutates the loaded entities and relies on change tracking. One query instead
        // of a FirstOrDefaultAsync per record, which was a round trip per element of the batch with the connection
        // held for all of them. See EntityIdFilter for why the predicate is built rather than written as Contains.
        Dictionary<Guid, ShiftEntity> existingShifts = await this.context.Shifts
            .Where(x => x.UserId == userId)
            .Where(EntityIdFilter.IdIn<ShiftEntity>(incomingIds))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        // Identifiers that already exist under some other account. Id is the primary key and is not scoped by user,
        // so an incoming record carrying somebody else's identifier used to fall through to Add and blow up on a
        // duplicate key — aborting the whole SaveChanges, silently discarding the rest of a legitimate batch, and
        // turning the endpoint into an enumeration oracle where 200 meant "free" and 500 meant "taken".
        //
        // Such a record is skipped. It is not this user's to write, and the rest of the batch goes through.
        HashSet<Guid> foreignIds = (await this.context.Shifts
            .AsNoTracking()
            .Where(EntityIdFilter.IdIn<ShiftEntity>(incomingIds))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken))
            .Where(id => !existingShifts.ContainsKey(id))
            .ToHashSet();

        foreach (ShiftEntity incoming in shifts)
        {
            if (foreignIds.Contains(incoming.Id))
            {
                continue;
            }

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

        await this.context.SaveChangesAsync(cancellationToken);

        return shifts.Count - foreignIds.Count;
    }
}
