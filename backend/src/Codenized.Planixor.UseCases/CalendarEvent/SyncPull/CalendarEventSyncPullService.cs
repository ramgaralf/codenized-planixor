// <copyright file="CalendarEventSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos;
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
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A <see cref="CalendarEventSyncPullResponse"/> with the calendar events and cursor.</returns>
    public async Task<CalendarEventSyncPullResponse> Run(CalendarEventSyncPullRequest request, CancellationToken cancellationToken)
    {
        // Normalised, not taken as-is: the value is bound from the query string and compared against a UTC
        // column, so its DateTimeKind decides whether records are skipped or repeated. See SyncWatermark.
        DateTime lastSyncedAt = SyncWatermark.Normalise(request.LastSyncedAt);

        // Read BEFORE the query, and returned so the client sends it back as the next watermark. The filter
        // compares against SyncedAt, which this server stamps; a watermark the client derived from its own clock is
        // a different clock, and anything stamped inside the drift is skipped for good. Reading it first also
        // closes the window: whatever is stamped while this query runs falls after this instant, so the next cycle
        // still asks for it.
        DateTime serverSyncedAt = DateTime.UtcNow;

        CalendarEventSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor,
            cancellationToken);

        List<CalendarEventSyncRecord> records = result.CalendarEvents.Select(calendarEvent => new CalendarEventSyncRecord(
            calendarEvent.Id,
            calendarEvent.EventType,
            calendarEvent.EventTypeId,
            calendarEvent.StartDay.ToString("yyyy-MM-dd"),
            calendarEvent.EndDay.ToString("yyyy-MM-dd"),
            calendarEvent.StartTime,
            calendarEvent.EndTime,
            calendarEvent.TotalHours,
            calendarEvent.Notes,
            AlertOffsetsMapper.Deserialize(calendarEvent.AlertOffsetsJson),
            calendarEvent.SeriesId,
            calendarEvent.ModifiedAt,
            calendarEvent.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} calendar events returned, HasMore: {HasMore}.",
            request.UserId,
            records.Count,
            result.HasMore);

        return new CalendarEventSyncPullResponse(records, result.Cursor, serverSyncedAt);
    }
}
