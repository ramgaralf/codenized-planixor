// <copyright file="AnnualHoursConfigSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using Codenized.OpenTelemetry.Logger.Aspects;
using Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;
using Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Annual hours config sync push service. Receives a batch of annual hours config records
/// from the client, maps them to domain entities, and upserts with last-writer-wins conflict resolution.
/// </summary>
[LogMethod]
public sealed class AnnualHoursConfigSyncPushService : IInteractorService<AnnualHoursConfigSyncPushRequest, AnnualHoursConfigSyncPushResponse>
{
    /// <summary>The largest batch the use case will process.</summary>
    private const int MaxBatchSize = 100;

    private readonly IAnnualHoursConfigSyncPushCommands commands;
    private readonly ILogger<AnnualHoursConfigSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The annual hours config sync push commands.</param>
    /// <param name="logger">The logger.</param>
    public AnnualHoursConfigSyncPushService(
        IAnnualHoursConfigSyncPushCommands commands,
        ILogger<AnnualHoursConfigSyncPushService> logger)
    {
        this.commands = commands;
        this.logger = logger;
    }

    /// <summary>
    /// Processes the annual hours config sync push request by mapping DTOs to entities and upserting them.
    /// </summary>
    /// <param name="request">The annual hours config sync push request containing the batch of records.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A response indicating the number of records processed.</returns>
    public async Task<AnnualHoursConfigSyncPushResponse> Run(AnnualHoursConfigSyncPushRequest request, CancellationToken cancellationToken)
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

        IReadOnlyList<AnnualHoursConfigEntity> configs = request.Records
            .Select(record => AnnualHoursConfigEntity.CreateFromSync(
                record.Id,
                request.UserId,
                record.Year,
                record.ConfiguredHours,
                record.ModifiedAt,
                record.IsDeleted))
            .ToList();

        // The count comes back from the repository rather than from the batch size: a record whose identifier
        // already belongs to another account is skipped, so the two are not always the same number.
        int persisted = await this.commands.UpsertAsync(request.UserId, configs, cancellationToken);

        this.logger.LogInformation(
            "Annual hours config sync push for user {UserId}: {Persisted} of {BatchSize} records persisted.",
            request.UserId,
            persisted,
            configs.Count);

        return new AnnualHoursConfigSyncPushResponse(persisted);
    }
}
