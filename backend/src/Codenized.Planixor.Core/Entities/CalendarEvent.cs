// <copyright file="CalendarEvent.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents a calendar event linking a shift or reminder to a date range and time range.
/// </summary>
public sealed class CalendarEvent
{
    private CalendarEvent()
    {
    }

    /// <summary>
    /// Gets the calendar event identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Gets the user identifier who owns this calendar event.
    /// </summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>
    /// Gets the event type discriminator ("shift" or "reminder").
    /// </summary>
    public string EventType { get; private set; } = null!;

    /// <summary>
    /// Gets the identifier of the referenced shift or reminder.
    /// </summary>
    public Guid EventTypeId { get; private set; }

    /// <summary>
    /// Gets the start calendar day for this event.
    /// </summary>
    public DateOnly StartDay { get; private set; }

    /// <summary>
    /// Gets the end calendar day for this event (greater than or equal to StartDay).
    /// </summary>
    public DateOnly EndDay { get; private set; }

    /// <summary>
    /// Gets the start time in minutes from midnight (0–1439).
    /// </summary>
    public int StartTime { get; private set; }

    /// <summary>
    /// Gets the end time in minutes from midnight (0–1439).
    /// </summary>
    public int EndTime { get; private set; }

    /// <summary>
    /// Gets the total duration in minutes (computed, read-only).
    /// </summary>
    public int TotalHours { get; private set; }

    /// <summary>
    /// Gets the optional notes for this event (max 250 characters).
    /// </summary>
    public string? Notes { get; private set; }

    /// <summary>
    /// Gets the alert offsets as a JSON string (e.g., "[0,10,60]"). Stored as VARCHAR(50).
    /// </summary>
    public string AlertOffsetsJson { get; private set; } = "[]";

    /// <summary>
    /// Gets the series identifier shared by all events in the same series.
    /// Empty string means the event is not part of a series.
    /// </summary>
    public string SeriesId { get; private set; } = string.Empty;

    /// <summary>
    /// Gets the last modification timestamp (UTC).
    /// </summary>
    public DateTime ModifiedAt { get; private set; }

    /// <summary>
    /// Gets the last synchronization timestamp (UTC), or null if never synced.
    /// </summary>
    public DateTime? SyncedAt { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the calendar event is soft-deleted.
    /// </summary>
    public bool IsDeleted { get; private set; }

    /// <summary>
    /// Creates a new calendar event from synchronization push data.
    /// </summary>
    /// <param name="id">The calendar event identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="eventType">The event type ("shift" or "reminder").</param>
    /// <param name="eventTypeId">The referenced shift or reminder identifier.</param>
    /// <param name="startDay">The start calendar day.</param>
    /// <param name="endDay">The end calendar day.</param>
    /// <param name="startTime">The start time in minutes from midnight.</param>
    /// <param name="endTime">The end time in minutes from midnight.</param>
    /// <param name="totalHours">The total duration in minutes.</param>
    /// <param name="notes">Optional notes (max 250 characters).</param>
    /// <param name="alertOffsetsJson">The alert offsets as a JSON array string.</param>
    /// <param name="seriesId">The series identifier (empty if not part of a series).</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the event is soft-deleted.</param>
    /// <returns>A new <see cref="CalendarEvent"/> instance.</returns>
    public static CalendarEvent CreateFromSync(
        Guid id,
        string userId,
        string eventType,
        Guid eventTypeId,
        DateOnly startDay,
        DateOnly endDay,
        int startTime,
        int endTime,
        int totalHours,
        string? notes,
        string alertOffsetsJson,
        string seriesId,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new CalendarEvent
        {
            Id = id,
            UserId = userId,
            EventType = eventType,
            EventTypeId = eventTypeId,
            StartDay = startDay,
            EndDay = endDay,
            StartTime = startTime,
            EndTime = endTime,
            TotalHours = totalHours,
            Notes = notes,
            AlertOffsetsJson = alertOffsetsJson,
            SeriesId = seriesId,
            ModifiedAt = modifiedAt,
            IsDeleted = isDeleted,
            SyncedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Applies synchronization push data to this calendar event, overwriting all mutable fields.
    /// </summary>
    /// <param name="eventType">The event type ("shift" or "reminder").</param>
    /// <param name="eventTypeId">The referenced shift or reminder identifier.</param>
    /// <param name="startDay">The start calendar day.</param>
    /// <param name="endDay">The end calendar day.</param>
    /// <param name="startTime">The start time in minutes from midnight.</param>
    /// <param name="endTime">The end time in minutes from midnight.</param>
    /// <param name="totalHours">The total duration in minutes.</param>
    /// <param name="notes">Optional notes (max 250 characters).</param>
    /// <param name="alertOffsetsJson">The alert offsets as a JSON array string.</param>
    /// <param name="seriesId">The series identifier (empty if not part of a series).</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the event is soft-deleted.</param>
    public void ApplySync(
        string eventType,
        Guid eventTypeId,
        DateOnly startDay,
        DateOnly endDay,
        int startTime,
        int endTime,
        int totalHours,
        string? notes,
        string alertOffsetsJson,
        string seriesId,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.EventType = eventType;
        this.EventTypeId = eventTypeId;
        this.StartDay = startDay;
        this.EndDay = endDay;
        this.StartTime = startTime;
        this.EndTime = endTime;
        this.TotalHours = totalHours;
        this.Notes = notes;
        this.AlertOffsetsJson = alertOffsetsJson;
        this.SeriesId = seriesId;
        this.ModifiedAt = modifiedAt;
        this.IsDeleted = isDeleted;
        this.SyncedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the calendar event as synced by setting SyncedAt to the current UTC timestamp.
    /// </summary>
    public void MarkSynced()
    {
        this.SyncedAt = DateTime.UtcNow;
    }
}
