// <copyright file="NotificationRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents a notification record tracking delivery state for a calendar event alert.
/// </summary>
public sealed class NotificationRecord
{
    private NotificationRecord()
    {
    }

    /// <summary>
    /// Gets the notification record identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Gets the user identifier who owns this notification record.
    /// </summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>
    /// Gets the calendar event identifier this notification is for.
    /// </summary>
    public Guid CalendarEventId { get; private set; }

    /// <summary>
    /// Gets the alert offset in minutes before the event start (0, 10, 60, or 1440).
    /// </summary>
    public int AlertOffset { get; private set; }

    /// <summary>
    /// Gets the computed trigger time (event start minus alert offset).
    /// </summary>
    public DateTime TriggerTime { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the notification has been delivered.
    /// </summary>
    public bool IsDelivered { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the notification has been read by the user.
    /// </summary>
    public bool IsRead { get; private set; }

    /// <summary>
    /// Gets the last modification timestamp (UTC).
    /// </summary>
    public DateTime ModifiedAt { get; private set; }

    /// <summary>
    /// Gets the last synchronization timestamp (UTC), or null if never synced.
    /// </summary>
    public DateTime? SyncedAt { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the notification record is soft-deleted.
    /// </summary>
    public bool IsDeleted { get; private set; }

    /// <summary>
    /// Creates a new notification record from synchronization push data.
    /// </summary>
    /// <param name="id">The notification record identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="calendarEventId">The calendar event identifier.</param>
    /// <param name="alertOffset">The alert offset in minutes.</param>
    /// <param name="triggerTime">The computed trigger time (UTC).</param>
    /// <param name="isDelivered">Whether the notification has been delivered.</param>
    /// <param name="isRead">Whether the notification has been read.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the notification record is soft-deleted.</param>
    /// <returns>A new <see cref="NotificationRecord"/> instance.</returns>
    public static NotificationRecord CreateFromSync(
        Guid id,
        string userId,
        Guid calendarEventId,
        int alertOffset,
        DateTime triggerTime,
        bool isDelivered,
        bool isRead,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new NotificationRecord
        {
            Id = id,
            UserId = userId,
            CalendarEventId = calendarEventId,
            AlertOffset = alertOffset,
            TriggerTime = triggerTime,
            IsDelivered = isDelivered,
            IsRead = isRead,
            ModifiedAt = modifiedAt,
            IsDeleted = isDeleted,
            SyncedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Applies synchronization push data to this notification record, overwriting all mutable fields.
    /// </summary>
    /// <param name="calendarEventId">The calendar event identifier.</param>
    /// <param name="alertOffset">The alert offset in minutes.</param>
    /// <param name="triggerTime">The computed trigger time (UTC).</param>
    /// <param name="isDelivered">Whether the notification has been delivered.</param>
    /// <param name="isRead">Whether the notification has been read.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the notification record is soft-deleted.</param>
    public void ApplySync(
        Guid calendarEventId,
        int alertOffset,
        DateTime triggerTime,
        bool isDelivered,
        bool isRead,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.CalendarEventId = calendarEventId;
        this.AlertOffset = alertOffset;
        this.TriggerTime = triggerTime;
        this.IsDelivered = isDelivered;
        this.IsRead = isRead;
        this.ModifiedAt = modifiedAt;
        this.IsDeleted = isDeleted;
        this.SyncedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the notification record as synced by setting SyncedAt to the current UTC timestamp.
    /// </summary>
    public void MarkSynced()
    {
        this.SyncedAt = DateTime.UtcNow;
    }
}
