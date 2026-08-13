// <copyright file="NotificationRecordSyncPushQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.NotificationRecord.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Queries;
using Microsoft.EntityFrameworkCore;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Repository implementation for querying notification records during sync push.
/// Provides methods for conflict detection and ownership verification.
/// </summary>
public sealed class NotificationRecordSyncPushQueries : INotificationRecordSyncPushQueries, IRepository
{
    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncPushQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public NotificationRecordSyncPushQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves notification records by their identifiers, scoped to the specified user.
    /// Only returns records owned by the given user.
    /// </summary>
    /// <param name="ids">The list of notification record identifiers to look up.</param>
    /// <param name="userId">The user identifier to scope the query.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A read-only list of notification records matching the provided IDs and owned by the user.</returns>
    public async Task<IReadOnlyList<NotificationRecordEntity>> GetByIdsAsync(IReadOnlyList<Guid> ids, string userId, CancellationToken cancellationToken)
    {
        if (ids == null || ids.Count == 0)
        {
            return Array.Empty<NotificationRecordEntity>();
        }

        // Both filters run in the database. This used to load every record the user owns and filter in memory, so a
        // push by an account with a year of history materialised tens of thousands of rows to resolve at most 100
        // identifiers. See EntityIdFilter for why the predicate is built rather than written as ids.Contains(n.Id).
        return await this.context.NotificationRecords
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .Where(EntityIdFilter.IdIn<NotificationRecordEntity>(ids))
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Checks which of the provided notification record identifiers exist in the store
    /// regardless of ownership. Used to detect ownership conflicts.
    /// </summary>
    /// <param name="ids">The list of notification record identifiers to check.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A set of identifiers that exist in the store.</returns>
    public async Task<IReadOnlySet<Guid>> GetExistingIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
    {
        if (ids == null || ids.Count == 0)
        {
            return new HashSet<Guid>();
        }

        // One query. This used to be an AnyAsync per identifier — up to a hundred round trips in a single request,
        // holding the connection for all of them.
        List<Guid> found = await this.context.NotificationRecords
            .AsNoTracking()
            .Where(EntityIdFilter.IdIn<NotificationRecordEntity>(ids))
            .Select(n => n.Id)
            .ToListAsync(cancellationToken);

        return found.ToHashSet();
    }
}
