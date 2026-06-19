// <copyright file="IAnnualHoursConfigSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush.Commands;

using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Defines write operations for annual hours config synchronization push.
/// </summary>
public interface IAnnualHoursConfigSyncPushCommands
{
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
    Task UpsertAsync(Guid userId, IReadOnlyList<AnnualHoursConfigEntity> configs);
}
