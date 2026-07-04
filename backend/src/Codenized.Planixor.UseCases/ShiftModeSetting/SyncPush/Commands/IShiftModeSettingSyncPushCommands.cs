// <copyright file="IShiftModeSettingSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush.Commands;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Defines write operations for shift mode setting synchronization push.
/// </summary>
public interface IShiftModeSettingSyncPushCommands
{
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
    Task UpsertAsync(string userId, IReadOnlyList<ShiftModeSetting> records);
}
