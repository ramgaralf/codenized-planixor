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
    /// <returns>A read-only list of notification records matching the provided IDs and owned by the user.</returns>
    public async Task<IReadOnlyList<NotificationRecordEntity>> GetByIdsAsync(IReadOnlyList<Guid> ids, string userId)
    {
        if (ids == null || ids.Count == 0)
        {
            return Array.Empty<NotificationRecordEntity>();
        }

        HashSet<Guid> idsSet = ids.ToHashSet();

        List<NotificationRecordEntity> records = await this.context.NotificationRecords
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .ToListAsync();

        return records.Where(n => idsSet.Contains(n.Id)).ToList();
    }

    /// <summary>
    /// Checks which of the provided notification record identifiers exist in the store
    /// regardless of ownership. Used to detect ownership conflicts.
    /// </summary>
    /// <param name="ids">The list of notification record identifiers to check.</param>
    /// <returns>A set of identifiers that exist in the store.</returns>
    public async Task<IReadOnlySet<Guid>> GetExistingIdsAsync(IReadOnlyList<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
        {
            return new HashSet<Guid>();
        }

        var existingIds = new HashSet<Guid>();

        foreach (Guid id in ids)
        {
            bool exists = await this.context.NotificationRecords
                .AsNoTracking()
                .AnyAsync(n => n.Id == id);

            if (exists)
            {
                existingIds.Add(id);
            }
        }

        return existingIds;
    }
}
