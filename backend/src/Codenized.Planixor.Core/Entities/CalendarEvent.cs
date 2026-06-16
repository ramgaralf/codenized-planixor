// <copyright file="CalendarEvent.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents a calendar event linking a shift or reminder to a specific day and time range.
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
    public Guid UserId { get; private set; }

    /// <summary>
    /// Gets the event type discriminator ("shift" or "reminder").
    /// </summary>
    public string EventType { get; private set; } = null!;

    /// <summary>
    /// Gets the identifier of the referenced shift or reminder.
    /// </summary>
    public Guid EventTypeId { get; private set; }

    /// <summary>
    /// Gets the calendar day for this event.
    /// </summary>
    public DateOnly Day { get; private set; }

    /// <summary>
    /// Gets the start time in minutes from midnight (0–1439).
    /// </summary>
    public int StartTime { get; private set; }

    /// <summary>
    /// Gets the end time in minutes from midnight (0–1439).
    /// </summary>
    public int EndTime { get; private set; }

    /// <summary>
    /// Gets the optional notes for this event.
    /// </summary>
    public string? Notes { get; private set; }

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
    /// <param name="day">The calendar day.</param>
    /// <param name="startTime">The start time in minutes from midnight.</param>
    /// <param name="endTime">The end time in minutes from midnight.</param>
    /// <param name="notes">Optional notes.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the event is soft-deleted.</param>
    /// <returns>A new <see cref="CalendarEvent"/> instance.</returns>
    public static CalendarEvent CreateFromSync(
        Guid id,
        Guid userId,
        string eventType,
        Guid eventTypeId,
        DateOnly day,
        int startTime,
        int endTime,
        string? notes,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new CalendarEvent
        {
            Id = id,
            UserId = userId,
            EventType = eventType,
            EventTypeId = eventTypeId,
            Day = day,
            StartTime = startTime,
            EndTime = endTime,
            Notes = notes,
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
    /// <param name="day">The calendar day.</param>
    /// <param name="startTime">The start time in minutes from midnight.</param>
    /// <param name="endTime">The end time in minutes from midnight.</param>
    /// <param name="notes">Optional notes.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the event is soft-deleted.</param>
    public void ApplySync(
        string eventType,
        Guid eventTypeId,
        DateOnly day,
        int startTime,
        int endTime,
        string? notes,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.EventType = eventType;
        this.EventTypeId = eventTypeId;
        this.Day = day;
        this.StartTime = startTime;
        this.EndTime = endTime;
        this.Notes = notes;
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
