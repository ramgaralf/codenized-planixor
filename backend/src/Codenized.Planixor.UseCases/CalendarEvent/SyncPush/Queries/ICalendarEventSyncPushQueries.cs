// <copyright file="ICalendarEventSyncPushQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Queries;

using CalendarEventEntity = Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Defines read operations for calendar event synchronization push.
/// </summary>
public interface ICalendarEventSyncPushQueries
{
    /// <summary>
    /// Retrieves calendar events by their identifiers, scoped to the specified user.
    /// Only returns records owned by the given user.
    /// </summary>
    /// <param name="ids">The list of calendar event identifiers to look up.</param>
    /// <param name="userId">The user identifier to scope the query.</param>
    /// <returns>A read-only list of calendar events matching the provided IDs and owned by the user.</returns>
    Task<IReadOnlyList<CalendarEventEntity>> GetByIdsAsync(IReadOnlyList<Guid> ids, string userId);

    /// <summary>
    /// Checks which of the provided calendar event identifiers exist in the store
    /// regardless of ownership. Used to detect ownership conflicts.
    /// </summary>
    /// <param name="ids">The list of calendar event identifiers to check.</param>
    /// <returns>A set of identifiers that exist in the store.</returns>
    Task<IReadOnlySet<Guid>> GetExistingIdsAsync(IReadOnlyList<Guid> ids);
}
