// <copyright file="Shift.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

using Codenized.Planixor.Core.ValueObjects;

/// <summary>
/// Represents a work shift template in the scheduling system.
/// </summary>
public sealed class Shift
{
    private Shift()
    {
    }

    /// <summary>
    /// Gets the shift identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Gets the user identifier who owns this shift.
    /// </summary>
    public Guid UserId { get; private set; }

    /// <summary>
    /// Gets the shift name.
    /// </summary>
    public ShiftName Name { get; private set; } = null!;

    /// <summary>
    /// Gets the shift icon.
    /// </summary>
    public ShiftIcon Icon { get; private set; } = null!;

    /// <summary>
    /// Gets the shift background color.
    /// </summary>
    public ShiftColor BackgroundColor { get; private set; } = null!;

    /// <summary>
    /// Gets the shift start time.
    /// </summary>
    public ShiftTime StartTime { get; private set; } = null!;

    /// <summary>
    /// Gets the shift end time.
    /// </summary>
    public ShiftTime EndTime { get; private set; } = null!;

    /// <summary>
    /// Gets the hours worked for this shift.
    /// </summary>
    public HoursWorked HoursWorked { get; private set; } = null!;

    /// <summary>
    /// Gets a value indicating whether the shift is active.
    /// </summary>
    public bool IsActive { get; private set; }

    /// <summary>
    /// Gets the last modification timestamp (UTC).
    /// </summary>
    public DateTime ModifiedAt { get; private set; }

    /// <summary>
    /// Gets the last synchronization timestamp (UTC), or null if never synced.
    /// </summary>
    public DateTime? SyncedAt { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the shift is soft-deleted.
    /// </summary>
    public bool IsDeleted { get; private set; }

    /// <summary>
    /// Gets the creation timestamp (UTC).
    /// </summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// Creates a new shift with system-generated fields.
    /// </summary>
    /// <param name="id">The shift identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="name">The shift name.</param>
    /// <param name="icon">The shift icon.</param>
    /// <param name="backgroundColor">The shift background color.</param>
    /// <param name="startTime">The shift start time.</param>
    /// <param name="endTime">The shift end time.</param>
    /// <param name="hoursWorked">The hours worked.</param>
    /// <param name="createdAt">The creation timestamp (UTC).</param>
    /// <returns>A new <see cref="Shift"/> instance.</returns>
    public static Shift Create(
        Guid id,
        Guid userId,
        ShiftName name,
        ShiftIcon icon,
        ShiftColor backgroundColor,
        ShiftTime startTime,
        ShiftTime endTime,
        HoursWorked hoursWorked,
        DateTime createdAt)
    {
        return new Shift
        {
            Id = id,
            UserId = userId,
            Name = name,
            Icon = icon,
            BackgroundColor = backgroundColor,
            StartTime = startTime,
            EndTime = endTime,
            HoursWorked = hoursWorked,
            IsActive = true,
            ModifiedAt = DateTime.UtcNow,
            SyncedAt = null,
            IsDeleted = false,
            CreatedAt = createdAt,
        };
    }

    /// <summary>
    /// Creates a shift from synchronization push data with all fields provided by the client.
    /// </summary>
    /// <param name="id">The shift identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="name">The shift name.</param>
    /// <param name="icon">The shift icon.</param>
    /// <param name="backgroundColor">The shift background color.</param>
    /// <param name="startTime">The shift start time.</param>
    /// <param name="endTime">The shift end time.</param>
    /// <param name="hoursWorked">The hours worked.</param>
    /// <param name="isActive">Whether the shift is active.</param>
    /// <param name="createdAt">The creation timestamp (UTC).</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the shift is soft-deleted.</param>
    /// <returns>A new <see cref="Shift"/> instance from sync data.</returns>
    public static Shift CreateFromSync(
        Guid id,
        Guid userId,
        ShiftName name,
        ShiftIcon icon,
        ShiftColor backgroundColor,
        ShiftTime startTime,
        ShiftTime endTime,
        HoursWorked hoursWorked,
        bool isActive,
        DateTime createdAt,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new Shift
        {
            Id = id,
            UserId = userId,
            Name = name,
            Icon = icon,
            BackgroundColor = backgroundColor,
            StartTime = startTime,
            EndTime = endTime,
            HoursWorked = hoursWorked,
            IsActive = isActive,
            CreatedAt = createdAt,
            ModifiedAt = modifiedAt,
            IsDeleted = isDeleted,
            SyncedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Updates the shift with new field values. Preserves Id, sets ModifiedAt to UTC now.
    /// </summary>
    /// <param name="name">The new shift name.</param>
    /// <param name="icon">The new shift icon.</param>
    /// <param name="backgroundColor">The new background color.</param>
    /// <param name="startTime">The new start time.</param>
    /// <param name="endTime">The new end time.</param>
    /// <param name="hoursWorked">The new hours worked.</param>
    public void Update(
        ShiftName name,
        ShiftIcon icon,
        ShiftColor backgroundColor,
        ShiftTime startTime,
        ShiftTime endTime,
        HoursWorked hoursWorked)
    {
        this.Name = name;
        this.Icon = icon;
        this.BackgroundColor = backgroundColor;
        this.StartTime = startTime;
        this.EndTime = endTime;
        this.HoursWorked = hoursWorked;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Soft-deletes the shift by setting IsDeleted to true, SyncedAt to null, and updating ModifiedAt.
    /// </summary>
    public void SoftDelete()
    {
        this.IsDeleted = true;
        this.SyncedAt = null;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Toggles the active status of the shift and updates ModifiedAt.
    /// </summary>
    public void ToggleActive()
    {
        this.IsActive = !this.IsActive;
        this.ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Applies synchronization push data to this shift, overwriting all mutable fields.
    /// </summary>
    /// <param name="name">The shift name.</param>
    /// <param name="icon">The shift icon.</param>
    /// <param name="backgroundColor">The shift background color.</param>
    /// <param name="startTime">The shift start time.</param>
    /// <param name="endTime">The shift end time.</param>
    /// <param name="hoursWorked">The hours worked.</param>
    /// <param name="isActive">Whether the shift is active.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the shift is soft-deleted.</param>
    public void ApplySync(
        ShiftName name,
        ShiftIcon icon,
        ShiftColor backgroundColor,
        ShiftTime startTime,
        ShiftTime endTime,
        HoursWorked hoursWorked,
        bool isActive,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.Name = name;
        this.Icon = icon;
        this.BackgroundColor = backgroundColor;
        this.StartTime = startTime;
        this.EndTime = endTime;
        this.HoursWorked = hoursWorked;
        this.IsActive = isActive;
        this.ModifiedAt = modifiedAt;
        this.IsDeleted = isDeleted;
        this.SyncedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the shift as synced by setting SyncedAt to the current UTC timestamp.
    /// </summary>
    public void MarkSynced()
    {
        this.SyncedAt = DateTime.UtcNow;
    }
}
