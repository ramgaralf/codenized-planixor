// <copyright file="Reminder.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

using Codenized.Planixor.Core.ValueObjects;

/// <summary>
/// Represents a reusable reminder template in the scheduling system.
/// </summary>
public sealed class Reminder
{
    private Reminder()
    {
    }

    /// <summary>
    /// Gets the reminder identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Gets the user identifier who owns this reminder.
    /// </summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>
    /// Gets the reminder name.
    /// </summary>
    public ReminderName Name { get; private set; } = null!;

    /// <summary>
    /// Gets the reminder icon.
    /// </summary>
    public ReminderIcon Icon { get; private set; } = null!;

    /// <summary>
    /// Gets the reminder background color.
    /// </summary>
    public ReminderColor BackgroundColor { get; private set; } = null!;

    /// <summary>
    /// Gets a value indicating whether the reminder is active.
    /// </summary>
    public bool IsActive { get; private set; }

    /// <summary>
    /// Gets the creation timestamp (UTC).
    /// </summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// Gets the last modification timestamp (UTC).
    /// </summary>
    public DateTime ModifiedAt { get; private set; }

    /// <summary>
    /// Gets the last synchronization timestamp (UTC), or null if never synced.
    /// </summary>
    public DateTime? SyncedAt { get; private set; }

    /// <summary>
    /// Gets the series frequency for automatic calendar event generation.
    /// Valid values: "never", "weekly", "monthly", "yearly".
    /// </summary>
    public string SeriesFrequency { get; private set; } = "never";

    /// <summary>
    /// Gets the series end date for limiting automatic calendar event generation.
    /// ISO date format "YYYY-MM-DD". Empty string means no end date configured.
    /// </summary>
    public string SeriesEndDate { get; private set; } = string.Empty;

    /// <summary>
    /// Gets a value indicating whether the reminder is soft-deleted.
    /// </summary>
    public bool IsDeleted { get; private set; }

    /// <summary>
    /// Creates a new reminder with system-generated fields.
    /// </summary>
    /// <param name="id">The reminder identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="name">The reminder name.</param>
    /// <param name="icon">The reminder icon.</param>
    /// <param name="backgroundColor">The reminder background color.</param>
    /// <param name="createdAt">The creation timestamp (UTC).</param>
    /// <returns>A new <see cref="Reminder"/> instance.</returns>
    public static Reminder Create(
        Guid id,
        string userId,
        ReminderName name,
        ReminderIcon icon,
        ReminderColor backgroundColor,
        DateTime createdAt)
    {
        return new Reminder
        {
            Id = id,
            UserId = userId,
            Name = name,
            Icon = icon,
            BackgroundColor = backgroundColor,
            IsActive = true,
            CreatedAt = createdAt,
            ModifiedAt = DateTime.UtcNow,
            SyncedAt = null,
            IsDeleted = false,
        };
    }

    /// <summary>
    /// Creates a reminder from synchronization push data with all fields provided by the client.
    /// </summary>
    /// <param name="id">The reminder identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="name">The reminder name.</param>
    /// <param name="icon">The reminder icon.</param>
    /// <param name="backgroundColor">The reminder background color.</param>
    /// <param name="isActive">Whether the reminder is active.</param>
    /// <param name="seriesFrequency">The series frequency value.</param>
    /// <param name="seriesEndDate">The series end date (ISO format or empty).</param>
    /// <param name="createdAt">The creation timestamp (UTC).</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the reminder is soft-deleted.</param>
    /// <returns>A new <see cref="Reminder"/> instance from sync data.</returns>
    public static Reminder CreateFromSync(
        Guid id,
        string userId,
        ReminderName name,
        ReminderIcon icon,
        ReminderColor backgroundColor,
        bool isActive,
        string seriesFrequency,
        string seriesEndDate,
        DateTime createdAt,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new Reminder
        {
            Id = id,
            UserId = userId,
            Name = name,
            Icon = icon,
            BackgroundColor = backgroundColor,
            IsActive = isActive,
            SeriesFrequency = seriesFrequency,
            SeriesEndDate = seriesEndDate,
            CreatedAt = createdAt,
            ModifiedAt = modifiedAt,
            IsDeleted = isDeleted,
            SyncedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Updates the reminder with new field values. Preserves Id, SyncedAt, and IsDeleted, and updates ModifiedAt.
    /// </summary>
    /// <param name="name">The new reminder name.</param>
    /// <param name="icon">The new reminder icon.</param>
    /// <param name="backgroundColor">The new background color.</param>
    public void Update(
        ReminderName name,
        ReminderIcon icon,
        ReminderColor backgroundColor)
    {
        this.Name = name;
        this.Icon = icon;
        this.BackgroundColor = backgroundColor;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Deactivates the reminder by setting IsActive to false and updating ModifiedAt.
    /// </summary>
    public void Deactivate()
    {
        this.IsActive = false;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Activates the reminder by setting IsActive to true and updating ModifiedAt.
    /// </summary>
    public void Activate()
    {
        this.IsActive = true;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Soft-deletes the reminder by setting IsDeleted to true, SyncedAt to null, and updating ModifiedAt.
    /// </summary>
    public void SoftDelete()
    {
        this.IsDeleted = true;
        this.SyncedAt = null;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Applies synchronization push data to this reminder, overwriting all mutable fields.
    /// </summary>
    /// <param name="name">The reminder name.</param>
    /// <param name="icon">The reminder icon.</param>
    /// <param name="backgroundColor">The reminder background color.</param>
    /// <param name="isActive">Whether the reminder is active.</param>
    /// <param name="seriesFrequency">The series frequency value.</param>
    /// <param name="seriesEndDate">The series end date (ISO format or empty).</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the reminder is soft-deleted.</param>
    public void ApplySync(
        ReminderName name,
        ReminderIcon icon,
        ReminderColor backgroundColor,
        bool isActive,
        string seriesFrequency,
        string seriesEndDate,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.Name = name;
        this.Icon = icon;
        this.BackgroundColor = backgroundColor;
        this.IsActive = isActive;
        this.SeriesFrequency = seriesFrequency;
        this.SeriesEndDate = seriesEndDate;
        this.ModifiedAt = modifiedAt;
        this.IsDeleted = isDeleted;
        this.SyncedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the reminder as synced by setting SyncedAt to the current UTC timestamp.
    /// </summary>
    public void MarkSynced()
    {
        this.SyncedAt = DateTime.UtcNow;
    }
}
