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
/// <param name="StartDay">The start calendar date in ISO format (YYYY-MM-DD).</param>
/// <param name="EndDay">The end calendar date in ISO format (YYYY-MM-DD).</param>
/// <param name="StartTime">The start time as minutes from midnight.</param>
/// <param name="EndTime">The end time as minutes from midnight.</param>
/// <param name="TotalHours">The total duration in minutes.</param>
/// <param name="Notes">Optional notes for the event.</param>
/// <param name="AlertOffsets">Alert offsets in minutes before event start (subset of 0, 10, 60, 1440).</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="IsDeleted">Whether the event is soft-deleted.</param>
public record CalendarEventSyncRecord(
    Guid Id,
    string EventType,
    Guid EventTypeId,
    string StartDay,
    string EndDay,
    int StartTime,
    int EndTime,
    int TotalHours,
    string? Notes,
    List<int> AlertOffsets,
    DateTime ModifiedAt,
    bool IsDeleted);
