// <copyright file="INotificationRecordSyncPushQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Queries;

using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Defines read operations for notification record synchronization push.
/// </summary>
public interface INotificationRecordSyncPushQueries
{
    /// <summary>
    /// Retrieves notification records by their identifiers, scoped to the specified user.
    /// Only returns records owned by the given user.
    /// </summary>
    /// <param name="ids">The list of notification record identifiers to look up.</param>
    /// <param name="userId">The user identifier to scope the query.</param>
    /// <returns>A read-only list of notification records matching the provided IDs and owned by the user.</returns>
    Task<IReadOnlyList<NotificationRecordEntity>> GetByIdsAsync(IReadOnlyList<Guid> ids, string userId);

    /// <summary>
    /// Checks which of the provided notification record identifiers exist in the store
    /// regardless of ownership. Used to detect ownership conflicts.
    /// </summary>
    /// <param name="ids">The list of notification record identifiers to check.</param>
    /// <returns>A set of identifiers that exist in the store.</returns>
    Task<IReadOnlySet<Guid>> GetExistingIdsAsync(IReadOnlyList<Guid> ids);
}
