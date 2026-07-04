// <copyright file="ShiftModeSetting.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents the shift mode setting for a user. Exactly one record per user.
/// When enabled, the calendar restricts to Month and Year views and hides the "New Event" button.
/// </summary>
public sealed class ShiftModeSetting
{
    private ShiftModeSetting()
    {
    }

    /// <summary>
    /// Gets the shift mode setting identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Gets the user identifier who owns this setting.
    /// </summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>
    /// Gets a value indicating whether shift mode is enabled.
    /// </summary>
    public bool Enabled { get; private set; }

    /// <summary>
    /// Gets the last modification timestamp (UTC).
    /// </summary>
    public DateTime ModifiedAt { get; private set; }

    /// <summary>
    /// Gets the last synchronization timestamp (UTC), or null if never synced.
    /// </summary>
    public DateTime? SyncedAt { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the record is soft-deleted.
    /// </summary>
    public bool IsDeleted { get; private set; }

    /// <summary>
    /// Creates a new shift mode setting for the specified user with shift mode disabled by default.
    /// </summary>
    /// <param name="id">The setting identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <returns>A new <see cref="ShiftModeSetting"/> instance with enabled=false.</returns>
    public static ShiftModeSetting Create(Guid id, string userId)
    {
        return new ShiftModeSetting
        {
            Id = id,
            UserId = userId,
            Enabled = false,
            ModifiedAt = DateTime.UtcNow,
            SyncedAt = null,
            IsDeleted = false,
        };
    }

    /// <summary>
    /// Creates a shift mode setting from synchronization push data with all fields provided by the client.
    /// </summary>
    /// <param name="id">The setting identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="enabled">Whether shift mode is enabled.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the record is soft-deleted.</param>
    /// <returns>A new <see cref="ShiftModeSetting"/> instance from sync data.</returns>
    public static ShiftModeSetting CreateFromSync(
        Guid id,
        string userId,
        bool enabled,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new ShiftModeSetting
        {
            Id = id,
            UserId = userId,
            Enabled = enabled,
            ModifiedAt = modifiedAt,
            IsDeleted = isDeleted,
            SyncedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Applies synchronization push data to this setting, overwriting all mutable fields.
    /// </summary>
    /// <param name="enabled">Whether shift mode is enabled.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the record is soft-deleted.</param>
    public void ApplySync(
        bool enabled,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.Enabled = enabled;
        this.ModifiedAt = modifiedAt;
        this.IsDeleted = isDeleted;
        this.SyncedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the setting as synced by setting SyncedAt to the current UTC timestamp.
    /// </summary>
    public void MarkSynced()
    {
        this.SyncedAt = DateTime.UtcNow;
    }
}
