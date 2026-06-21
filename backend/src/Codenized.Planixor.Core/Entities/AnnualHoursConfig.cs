// <copyright file="AnnualHoursConfig.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents the configured required annual working hours for a specific year.
/// </summary>
public sealed class AnnualHoursConfig
{
    private AnnualHoursConfig()
    {
    }

    /// <summary>
    /// Gets the annual hours config identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Gets the user identifier who owns this configuration.
    /// </summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>
    /// Gets the calendar year this configuration applies to.
    /// </summary>
    public int Year { get; private set; }

    /// <summary>
    /// Gets the total required annual working hours (whole hours).
    /// </summary>
    public int ConfiguredHours { get; private set; }

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
    /// Creates a new annual hours config from synchronization push data.
    /// </summary>
    /// <param name="id">The configuration identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="year">The calendar year.</param>
    /// <param name="configuredHours">The configured annual working hours.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the record is soft-deleted.</param>
    /// <returns>A new <see cref="AnnualHoursConfig"/> instance.</returns>
    public static AnnualHoursConfig CreateFromSync(
        Guid id,
        string userId,
        int year,
        int configuredHours,
        DateTime modifiedAt,
        bool isDeleted)
    {
        return new AnnualHoursConfig
        {
            Id = id,
            UserId = userId,
            Year = year,
            ConfiguredHours = configuredHours,
            ModifiedAt = modifiedAt,
            IsDeleted = isDeleted,
            SyncedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Applies synchronization push data to this configuration, overwriting all mutable fields.
    /// </summary>
    /// <param name="year">The calendar year.</param>
    /// <param name="configuredHours">The configured annual working hours.</param>
    /// <param name="modifiedAt">The modification timestamp (UTC).</param>
    /// <param name="isDeleted">Whether the record is soft-deleted.</param>
    public void ApplySync(
        int year,
        int configuredHours,
        DateTime modifiedAt,
        bool isDeleted)
    {
        this.Year = year;
        this.ConfiguredHours = configuredHours;
        this.ModifiedAt = modifiedAt;
        this.IsDeleted = isDeleted;
        this.SyncedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the configuration as synced by setting SyncedAt to the current UTC timestamp.
    /// </summary>
    public void MarkSynced()
    {
        this.SyncedAt = DateTime.UtcNow;
    }
}
