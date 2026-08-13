// <copyright file="AnnualHoursConfigSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.AnnualHoursConfig.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Repository implementation for upserting annual hours config records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class AnnualHoursConfigSyncPushCommands : IAnnualHoursConfigSyncPushCommands, IRepository
{
    private readonly ApplicationWriteContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPushCommands"/> class.
    /// </summary>
    /// <param name="context">The application write context.</param>
    public AnnualHoursConfigSyncPushCommands(ApplicationWriteContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Upserts a batch of annual hours config records using last-writer-wins conflict resolution.
    /// For each record: if no existing record with the same Id exists, inserts it.
    /// If an existing record exists and the incoming modifiedAt is greater than or equal to
    /// the existing modifiedAt, the incoming record wins (remote wins on tie).
    /// Sets syncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="userId">The user identifier who owns the configurations.</param>
    /// <param name="configs">The batch of annual hours config entities to upsert.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task<int> UpsertAsync(string userId, IReadOnlyList<AnnualHoursConfigEntity> configs, CancellationToken cancellationToken)
    {
        if (configs == null || configs.Count == 0)
        {
            return 0;
        }

        List<Guid> incomingIds = configs.Select(c => c.Id).ToList();
        List<int> incomingYears = configs.Select(c => c.Year).Distinct().ToList();

        // Tracked on purpose: ApplySync mutates the loaded entities and relies on change tracking. One query instead
        // of a FirstOrDefaultAsync per record, which was a round trip per element of the batch with the connection
        // held for all of them. See EntityIdFilter for why the predicate is built rather than written as Contains.
        Dictionary<Guid, AnnualHoursConfigEntity> existingConfigs = await this.context.AnnualHoursConfigs
            .Where(c => c.UserId == userId)
            .Where(EntityIdFilter.IdIn<AnnualHoursConfigEntity>(incomingIds))
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        // The same year may already exist under a different Id, created by another device. That lookup was a second
        // query per record; the whole batch's years are fetched once here instead. Loaded after the by-Id set so the
        // change tracker returns the same instances for rows that appear in both.
        Dictionary<int, AnnualHoursConfigEntity> existingByYear = await this.context.AnnualHoursConfigs
            .Where(c => c.UserId == userId && incomingYears.Contains(c.Year))
            .ToDictionaryAsync(c => c.Year, cancellationToken);

        // Identifiers that already exist under some other account. Id is the primary key and is not scoped by user,
        // so an incoming record carrying somebody else's identifier used to fall through to Add and blow up on a
        // duplicate key — aborting the whole SaveChanges, silently discarding the rest of a legitimate batch, and
        // turning the endpoint into an enumeration oracle where 200 meant "free" and 500 meant "taken".
        //
        // Such a record is skipped. It is not this user's to write, and the rest of the batch goes through.
        HashSet<Guid> foreignIds = (await this.context.AnnualHoursConfigs
            .AsNoTracking()
            .Where(EntityIdFilter.IdIn<AnnualHoursConfigEntity>(incomingIds))
            .Select(c => c.Id)
            .ToListAsync(cancellationToken))
            .Where(id => !existingConfigs.ContainsKey(id))
            .ToHashSet();

        foreach (AnnualHoursConfigEntity incoming in configs)
        {
            if (foreignIds.Contains(incoming.Id))
            {
                continue;
            }

            if (existingConfigs.TryGetValue(incoming.Id, out AnnualHoursConfigEntity? existing))
            {
                if (incoming.ModifiedAt >= existing.ModifiedAt)
                {
                    existing.ApplySync(
                        incoming.Year,
                        incoming.ConfiguredHours,
                        incoming.ModifiedAt,
                        incoming.IsDeleted);
                }
            }
            else
            {
                // A record for the same UserId + Year may already exist under a different Id, created by another
                // device. Resolved from the set loaded above rather than with a query per record.
                if (existingByYear.TryGetValue(incoming.Year, out AnnualHoursConfigEntity? yearMatch))
                {
                    // Another device already created a config for this year — apply LWW
                    if (incoming.ModifiedAt >= yearMatch.ModifiedAt)
                    {
                        yearMatch.ApplySync(
                            incoming.Year,
                            incoming.ConfiguredHours,
                            incoming.ModifiedAt,
                            incoming.IsDeleted);
                    }
                }
                else
                {
                    incoming.MarkSynced();
                    this.context.AnnualHoursConfigs.Add(incoming);
                }
            }
        }

        await this.context.SaveChangesAsync(cancellationToken);

        return configs.Count - foreignIds.Count;
    }
}
