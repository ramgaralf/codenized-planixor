// <copyright file="ShiftModeSettingSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using Codenized.OpenTelemetry.Logger.Aspects;
using Codenized.Planixor.Dtos.ShiftModeSetting.Sync;
using Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using ShiftModeSettingEntity = Codenized.Planixor.Core.Entities.ShiftModeSetting;

/// <summary>
/// Shift mode setting sync push service. Receives a batch of shift mode setting records from the client,
/// maps them to domain entities, and upserts with last-writer-wins conflict resolution.
/// </summary>
[LogMethod]
public sealed class ShiftModeSettingSyncPushService : IInteractorService<ShiftModeSettingSyncPushRequest, ShiftModeSettingSyncPushResponse>
{
    /// <summary>The largest batch the use case will process.</summary>
    private const int MaxBatchSize = 100;

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
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A response indicating the number of records processed.</returns>
    public async Task<ShiftModeSettingSyncPushResponse> Run(ShiftModeSettingSyncPushRequest request, CancellationToken cancellationToken)
    {
        // The request validator enforces this too, and it is what produces the 400 with the offending
        // field. Repeated here as an invariant: a regression in the validator must not leave the route
        // unbounded, which is exactly the state this entity was in.
        if (request.Records.Count > MaxBatchSize)
        {
            throw new BadRequestException(
                "BATCH_SIZE_EXCEEDED",
                "Batch Size Exceeded",
                $"Batch size exceeds maximum of {MaxBatchSize}.");
        }

        IReadOnlyList<ShiftModeSettingEntity> records = request.Records
            .Select(item => ShiftModeSettingEntity.CreateFromSync(
                item.Id,
                request.UserId,
                item.Enabled,
                item.ModifiedAt,
                item.IsDeleted))
            .ToList();

        // The count comes back from the repository rather than from the batch size: a record whose identifier
        // already belongs to another account is skipped, so the two are not always the same number.
        int persisted = await this.commands.UpsertAsync(request.UserId, records, cancellationToken);

        this.logger.LogInformation(
            "Shift mode setting sync push for user {UserId}: {Persisted} of {BatchSize} records persisted.",
            request.UserId,
            persisted,
            records.Count);

        return new ShiftModeSettingSyncPushResponse(persisted);
    }
}
