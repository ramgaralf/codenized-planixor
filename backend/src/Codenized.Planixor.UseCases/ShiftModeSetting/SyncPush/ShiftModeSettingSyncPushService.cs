// <copyright file="ShiftModeSettingSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.ShiftModeSetting.Sync;
using Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using ShiftModeSettingEntity = Codenized.Planixor.Core.Entities.ShiftModeSetting;

/// <summary>
/// Shift mode setting sync push service. Receives a batch of shift mode setting records from the client,
/// maps them to domain entities, and upserts with last-writer-wins conflict resolution.
/// </summary>
public sealed class ShiftModeSettingSyncPushService : IInteractorService<ShiftModeSettingSyncPushRequest, ShiftModeSettingSyncPushResponse>
{
    private readonly IShiftModeSettingSyncPushCommands commands;
    private readonly ILogger<ShiftModeSettingSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftModeSettingSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The shift mode setting sync push commands.</param>
    /// <param name="logger">The logger.</param>
    public ShiftModeSettingSyncPushService(
        IShiftModeSettingSyncPushCommands commands,
        ILogger<ShiftModeSettingSyncPushService> logger)
    {
        this.commands = commands;
        this.logger = logger;
    }

    /// <summary>
    /// Processes the shift mode setting sync push request by mapping DTOs to entities and upserting them.
    /// </summary>
    /// <param name="request">The shift mode setting sync push request containing the batch of records.</param>
    /// <returns>A response indicating the number of records processed.</returns>
    public async Task<ShiftModeSettingSyncPushResponse> Run(ShiftModeSettingSyncPushRequest request)
    {
        this.logger.LogInformation(
            "Processing shift mode setting sync push for user {UserId} with {Count} records.",
            request.UserId,
            request.Records.Count);

        IReadOnlyList<ShiftModeSettingEntity> records = request.Records
            .Select(item => ShiftModeSettingEntity.CreateFromSync(
                item.Id,
                request.UserId,
                item.Enabled,
                item.ModifiedAt,
                item.IsDeleted))
            .ToList();

        await this.commands.UpsertAsync(request.UserId, records);

        this.logger.LogInformation(
            "Shift mode setting sync push completed for user {UserId}. {Count} records processed.",
            request.UserId,
            records.Count);

        return new ShiftModeSettingSyncPushResponse(records.Count);
    }
}
