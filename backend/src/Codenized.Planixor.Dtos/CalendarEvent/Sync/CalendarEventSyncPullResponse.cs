// <copyright file="CalendarEventSyncPullResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

/// <summary>
/// Response payload for pulling calendar event records from API to client.
/// </summary>
/// <param name="Records">The list of calendar event records returned.</param>
/// <param name="Cursor">The pagination cursor for the next page, or null if no more pages.</param>
public record CalendarEventSyncPullResponse(
    List<CalendarEventSyncRecord> Records,
    string? Cursor);
