// <copyright file="CalendarEventSyncPullResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

/// <summary>
/// Response payload for pulling calendar event records from API to client.
/// </summary>
/// <param name="Records">The list of calendar event records returned.</param>
/// <param name="Cursor">The pagination cursor for the next page, or null if no more pages.</param>
/// <param name="ServerSyncedAt">The server clock, read before the query ran. Send it back as the next
/// <c>lastSyncedAt</c>: the filter compares against a server-stamped column, so a watermark taken from the
/// client's own clock skips or repeats records depending on the drift between the two.</param>
public record CalendarEventSyncPullResponse(
    List<CalendarEventSyncRecord> Records,
    string? Cursor,
    DateTime ServerSyncedAt);
