// <copyright file="ShiftModeSettingSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.ShiftModeSetting.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using ShiftModeSettingEntity = Codenized.Planixor.Core.Entities.ShiftModeSetting;

/// <summary>
/// Repository implementation for upserting shift mode setting records during sync push.
/// Uses last-writer-wins conflict resolution based on modifiedAt.
/// On tie (identical modifiedAt), the incoming client record wins.
/// </summary>
public sealed class ShiftModeSettingSyncPushCommands : IShiftModeSettingSyncPushCommands, IRepository
{
    private readonly ApplicationWriteContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftModeSettingSyncPushCommands"/> class.
    /// </summary>
    /// <param name="context">The application write context.</param>
    public ShiftModeSettingSyncPushCommands(ApplicationWriteContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Upserts a shift mode setting record using last-writer-wins conflict resolution.
    /// If no existing record with the same Id exists, inserts it.
    /// If an existing record exists and the incoming modifiedAt is greater than or equal to
    /// the existing modifiedAt, the incoming record wins (remote wins on tie).
    /// Sets syncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="userId">The user identifier who owns the setting.</param>
    /// <param name="records">The shift mode setting records to upsert.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpsertAsync(string userId, IReadOnlyList<ShiftModeSettingEntity> records)
    {
        if (records == null || records.Count == 0)
        {
            return;
        }

        foreach (ShiftModeSettingEntity incoming in records)
        {
            ShiftModeSettingEntity? existing = await this.context.ShiftModeSettings
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Id == incoming.Id);

            if (existing != null)
            {
                if (incoming.ModifiedAt >= existing.ModifiedAt)
                {
                    existing.ApplySync(
                        incoming.Enabled,
                        incoming.ModifiedAt,
                        incoming.IsDeleted);
                }
            }
            else
            {
                incoming.MarkSynced();
                this.context.ShiftModeSettings.Add(incoming);
            }
        }

        await this.context.SaveChangesAsync();
    }
}
