// <copyright file="NotificationRecordSyncPushQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.NotificationRecord.SyncPush;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Queries;
using Microsoft.EntityFrameworkCore;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Repository implementation for querying notification records during sync push.
/// Provides methods for conflict detection and ownership verification.
/// </summary>
public sealed class NotificationRecordSyncPushQueries : INotificationRecordSyncPushQueries, IAppServiceScoped
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
    /// <returns>A read-only list of notification records matching the provided IDs and owned by the user.</returns>
    public async Task<IReadOnlyList<NotificationRecordEntity>> GetByIdsAsync(IReadOnlyList<Guid> ids, Guid userId)
    {
        List<NotificationRecordEntity> records = await this.context.NotificationRecords
            .AsNoTracking()
            .Where(n => n.UserId == userId && ids.Contains(n.Id))
            .ToListAsync();

        return records;
    }

    /// <summary>
    /// Checks which of the provided notification record identifiers exist in the store
    /// regardless of ownership. Used to detect ownership conflicts.
    /// </summary>
    /// <param name="ids">The list of notification record identifiers to check.</param>
    /// <returns>A set of identifiers that exist in the store.</returns>
    public async Task<IReadOnlySet<Guid>> GetExistingIdsAsync(IReadOnlyList<Guid> ids)
    {
        List<Guid> existingIds = await this.context.NotificationRecords
            .AsNoTracking()
            .Where(n => ids.Contains(n.Id))
            .Select(n => n.Id)
            .ToListAsync();

        return existingIds.ToHashSet();
    }
}
