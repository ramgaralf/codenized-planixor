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
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpsertBatchAsync(IReadOnlyList<CalendarEventEntity> calendarEvents)
    {
        if (calendarEvents == null || calendarEvents.Count == 0)
        {
            return;
        }

        Guid[] incomingIds = calendarEvents.Select(e => e.Id).ToArray();

        // Workaround for EF Core 10 + MySQL provider: load tracked entities individually
        var existingEvents = new Dictionary<Guid, CalendarEventEntity>();

        foreach (Guid id in incomingIds)
        {
            CalendarEventEntity? existing = await this.context.CalendarEvents
                .FirstOrDefaultAsync(e => e.Id == id);

            if (existing != null)
            {
                existingEvents[id] = existing;
            }
        }

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
                    incoming.ModifiedAt,
                    incoming.IsDeleted);
            }
            else
            {
                incoming.MarkSynced();
                this.context.CalendarEvents.Add(incoming);
            }
        }

        await this.context.SaveChangesAsync();
    }
}
