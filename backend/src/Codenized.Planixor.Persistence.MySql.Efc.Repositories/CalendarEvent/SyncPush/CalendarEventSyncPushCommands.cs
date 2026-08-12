// <copyright file="CalendarEventSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.CalendarEvent.SyncPush;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Commands;
using Microsoft.EntityFrameworkCore;
using CalendarEventEntity = Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Repository implementation for upserting calendar events during sync push.
/// Persists pre-processed entities (LWW already applied by the service).
/// </summary>
public sealed class CalendarEventSyncPushCommands : ICalendarEventSyncPushCommands, IRepository
{
    private readonly ApplicationWriteContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncPushCommands"/> class.
    /// </summary>
    /// <param name="context">The application write context.</param>
    public CalendarEventSyncPushCommands(ApplicationWriteContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Upserts a batch of calendar event records. For each entity, checks whether it already
    /// exists in the write context. Existing records are updated, new records are added.
    /// The service layer has already applied LWW conflict resolution and called MarkSynced/ApplySync.
    /// </summary>
    /// <param name="calendarEvents">The batch of calendar event entities to upsert.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpsertBatchAsync(IReadOnlyList<CalendarEventEntity> calendarEvents, CancellationToken cancellationToken)
    {
        if (calendarEvents == null || calendarEvents.Count == 0)
        {
            return;
        }

        List<Guid> incomingIds = calendarEvents.Select(e => e.Id).ToList();

        // Deliberately not scoped by user: ownership has already been established by the service through
        // GetExistingIdsAsync, and loading regardless of owner is what lets an event belonging to somebody else be
        // recognised rather than inserted into a duplicate key violation.
        //
        // Tracked on purpose: ApplySync mutates the loaded entities and relies on change tracking. One query instead
        // of a FirstOrDefaultAsync per record, which was a round trip per element of the batch with the connection
        // held for all of them. See EntityIdFilter for why the predicate is built rather than written as Contains.
        Dictionary<Guid, CalendarEventEntity> existingEvents = await this.context.CalendarEvents
            .Where(EntityIdFilter.IdIn<CalendarEventEntity>(incomingIds))
            .ToDictionaryAsync(e => e.Id, cancellationToken);

        foreach (CalendarEventEntity incoming in calendarEvents)
        {
            if (existingEvents.TryGetValue(incoming.Id, out CalendarEventEntity? existing))
            {
                existing.ApplySync(
                    incoming.EventType,
                    incoming.EventTypeId,
                    incoming.StartDay,
                    incoming.EndDay,
                    incoming.StartTime,
                    incoming.EndTime,
                    incoming.TotalHours,
                    incoming.Notes,
                    incoming.AlertOffsetsJson,
                    incoming.SeriesId,
                    incoming.ModifiedAt,
                    incoming.IsDeleted);
            }
            else
            {
                incoming.MarkSynced();
                this.context.CalendarEvents.Add(incoming);
            }
        }

        await this.context.SaveChangesAsync(cancellationToken);
    }
}
