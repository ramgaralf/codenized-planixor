// <copyright file="AnnualHoursConfigSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.AnnualHoursConfig.SyncPush;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Repository implementation for upserting annual hours config records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class AnnualHoursConfigSyncPushCommands : IAnnualHoursConfigSyncPushCommands, IAppServiceScoped
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
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpsertAsync(Guid userId, IReadOnlyList<AnnualHoursConfigEntity> configs)
    {
        List<Guid> incomingIds = configs.Select(c => c.Id).ToList();

        Dictionary<Guid, AnnualHoursConfigEntity> existingConfigs = await this.context.AnnualHoursConfigs
            .Where(c => c.UserId == userId && incomingIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id);

        foreach (AnnualHoursConfigEntity incoming in configs)
        {
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
                incoming.MarkSynced();
                this.context.AnnualHoursConfigs.Add(incoming);
            }
        }

        await this.context.SaveChangesAsync();
    }
}
