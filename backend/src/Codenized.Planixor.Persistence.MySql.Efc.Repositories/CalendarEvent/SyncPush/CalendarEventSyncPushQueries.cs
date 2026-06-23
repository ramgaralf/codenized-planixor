// <copyright file="CalendarEventSyncPushQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.CalendarEvent.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Queries;
using Microsoft.EntityFrameworkCore;
using CalendarEventEntity = Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Repository implementation for querying calendar events during sync push.
/// Provides methods for conflict detection and ownership verification.
/// </summary>
public sealed class CalendarEventSyncPushQueries : ICalendarEventSyncPushQueries, IRepository
{
    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncPushQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public CalendarEventSyncPushQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves calendar events by their identifiers, scoped to the specified user.
    /// Only returns records owned by the given user.
    /// </summary>
    /// <param name="ids">The list of calendar event identifiers to look up.</param>
    /// <param name="userId">The user identifier to scope the query.</param>
    /// <returns>A read-only list of calendar events matching the provided IDs and owned by the user.</returns>
    public async Task<IReadOnlyList<CalendarEventEntity>> GetByIdsAsync(IReadOnlyList<Guid> ids, string userId)
    {
        if (ids == null || ids.Count == 0)
        {
            return Array.Empty<CalendarEventEntity>();
        }

        // Workaround for EF Core 10 + MySQL provider type mapping issue with Contains() on Guid collections.
        // Load all user records and filter in memory for the matching IDs.
        HashSet<Guid> idsSet = ids.ToHashSet();

        List<CalendarEventEntity> records = await this.context.CalendarEvents
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .ToListAsync();

        return records.Where(e => idsSet.Contains(e.Id)).ToList();
    }

    /// <summary>
    /// Checks which of the provided calendar event identifiers exist in the store
    /// regardless of ownership. Used to detect ownership conflicts.
    /// </summary>
    /// <param name="ids">The list of calendar event identifiers to check.</param>
    /// <returns>A set of identifiers that exist in the store.</returns>
    public async Task<IReadOnlySet<Guid>> GetExistingIdsAsync(IReadOnlyList<Guid> ids)
    {
        if (ids == null || ids.Count == 0)
        {
            return new HashSet<Guid>();
        }

        // Workaround: check existence one by one to avoid Contains() type mapping issue
        var existingIds = new HashSet<Guid>();

        foreach (Guid id in ids)
        {
            bool exists = await this.context.CalendarEvents
                .AsNoTracking()
                .AnyAsync(e => e.Id == id);

            if (exists)
            {
                existingIds.Add(id);
            }
        }

        return existingIds;
    }
}
