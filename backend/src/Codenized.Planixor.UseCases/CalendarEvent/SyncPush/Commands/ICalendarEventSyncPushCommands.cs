// <copyright file="ICalendarEventSyncPushCommands.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Commands;

using CalendarEventEntity = Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Defines write operations for calendar event synchronization push.
/// </summary>
public interface ICalendarEventSyncPushCommands
{
    /// <summary>
    /// Upserts a batch of calendar event records. For new records, inserts them.
    /// For existing records, overwrites with the provided values.
    /// Sets SyncedAt to UTC now on successfully persisted records.
    /// </summary>
    /// <param name="calendarEvents">The batch of calendar event entities to upsert.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpsertBatchAsync(IReadOnlyList<CalendarEventEntity> calendarEvents);
}
