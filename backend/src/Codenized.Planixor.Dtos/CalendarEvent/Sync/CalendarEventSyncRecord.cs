// <copyright file="CalendarEventSyncRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

/// <summary>
/// Represents a single calendar event record in a sync payload (both push and pull).
/// </summary>
/// <param name="Id">The calendar event identifier.</param>
/// <param name="EventType">The event type: "shift" or "reminder".</param>
/// <param name="EventTypeId">The identifier of the shift or reminder template.</param>
/// <param name="Day">The calendar date in ISO format (YYYY-MM-DD).</param>
/// <param name="StartTime">The start time as minutes from midnight.</param>
/// <param name="EndTime">The end time as minutes from midnight.</param>
/// <param name="Notes">Optional notes for the event.</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="IsDeleted">Whether the event is soft-deleted.</param>
public record CalendarEventSyncRecord(
    Guid Id,
    string EventType,
    Guid EventTypeId,
    string Day,
    int StartTime,
    int EndTime,
    string? Notes,
    DateTime ModifiedAt,
    bool IsDeleted);
