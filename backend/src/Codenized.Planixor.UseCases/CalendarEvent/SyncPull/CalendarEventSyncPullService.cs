// <copyright file="CalendarEventSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.CalendarEvent.Sync;
using Codenized.Planixor.UseCases.CalendarEvent.SyncPull.Queries;
using Microsoft.Extensions.Logging;

/// <summary>
/// Calendar event sync pull service. Retrieves calendar events modified after a given timestamp
/// for the authenticated user with cursor-based pagination.
/// </summary>
public sealed class CalendarEventSyncPullService : IInteractorService<CalendarEventSyncPullRequest, CalendarEventSyncPullResponse>
{
    private readonly ILogger<CalendarEventSyncPullService> logger;
    private readonly ICalendarEventSyncPullQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncPullService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Calendar event sync pull queries.</param>
    public CalendarEventSyncPullService(
        ILogger<CalendarEventSyncPullService> logger,
        ICalendarEventSyncPullQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>
    /// Executes the calendar event sync pull use case.
    /// </summary>
    /// <param name="request">The calendar event sync pull request containing user ID, last synced timestamp, and cursor.</param>
    /// <returns>A <see cref="CalendarEventSyncPullResponse"/> with the calendar events and cursor.</returns>
    public async Task<CalendarEventSyncPullResponse> Run(CalendarEventSyncPullRequest request)
    {
        DateTime lastSyncedAt = request.LastSyncedAt ?? DateTime.MinValue;

        CalendarEventSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor);

        List<CalendarEventSyncRecord> records = result.CalendarEvents.Select(calendarEvent => new CalendarEventSyncRecord(
            calendarEvent.Id,
            calendarEvent.EventType,
            calendarEvent.EventTypeId,
            calendarEvent.Day.ToString("yyyy-MM-dd"),
            calendarEvent.StartTime,
            calendarEvent.EndTime,
            calendarEvent.Notes,
            calendarEvent.ModifiedAt,
            calendarEvent.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} calendar events returned, HasMore: {HasMore}.",
            request.UserId,
            records.Count,
            result.HasMore);

        return new CalendarEventSyncPullResponse(records, result.Cursor);
    }
}
