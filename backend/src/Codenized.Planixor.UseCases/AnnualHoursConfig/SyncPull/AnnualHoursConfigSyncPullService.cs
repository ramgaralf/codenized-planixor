// <copyright file="AnnualHoursConfigSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;
using Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPull.Queries;
using Microsoft.Extensions.Logging;

/// <summary>
/// Annual hours config sync pull service. Retrieves configs modified after a given timestamp
/// for the authenticated user with cursor-based pagination.
/// </summary>
public sealed class AnnualHoursConfigSyncPullService : IInteractorService<AnnualHoursConfigSyncPullRequest, AnnualHoursConfigSyncPullResponse>
{
    private readonly ILogger<AnnualHoursConfigSyncPullService> logger;
    private readonly IAnnualHoursConfigSyncPullQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPullService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Annual hours config sync pull queries.</param>
    public AnnualHoursConfigSyncPullService(
        ILogger<AnnualHoursConfigSyncPullService> logger,
        IAnnualHoursConfigSyncPullQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>
    /// Executes the annual hours config sync pull use case.
    /// </summary>
    /// <param name="request">The sync pull request containing user ID, last synced timestamp, and cursor.</param>
    /// <returns>A <see cref="AnnualHoursConfigSyncPullResponse"/> with the configs and cursor.</returns>
    public async Task<AnnualHoursConfigSyncPullResponse> Run(AnnualHoursConfigSyncPullRequest request)
    {
        DateTime lastSyncedAt = request.LastSyncedAt ?? DateTime.MinValue;

        AnnualHoursConfigSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor);

        List<AnnualHoursConfigSyncRecord> records = result.Records.Select(config => new AnnualHoursConfigSyncRecord(
            config.Id,
            config.Year,
            config.ConfiguredHours,
            config.ModifiedAt,
            config.SyncedAt,
            config.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} annual hours configs returned, HasMore: {HasMore}.",
            request.UserId,
            records.Count,
            result.HasMore);

        return new AnnualHoursConfigSyncPullResponse(records, result.Cursor);
    }
}
