// <copyright file="ShiftTime.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated time of day for a shift (hours and minutes).
/// Stored as total minutes from midnight.
/// </summary>
public record ShiftTime
{
    /// <summary>
    /// Gets the total minutes from midnight (0–1439).
    /// </summary>
    public int TotalMinutes { get; }

    /// <summary>
    /// Gets the hours component (0–23).
    /// </summary>
    public int Hours => this.TotalMinutes / 60;

    /// <summary>
    /// Gets the minutes component (0–59).
    /// </summary>
    public int Minutes => this.TotalMinutes % 60;

    private ShiftTime(int totalMinutes)
    {
        this.TotalMinutes = totalMinutes;
    }

    /// <summary>
    /// Creates a validated shift time from hours and minutes.
    /// </summary>
    /// <param name="hours">Hours (0–23).</param>
    /// <param name="minutes">Minutes (0–59).</param>
    /// <returns>A validated <see cref="ShiftTime"/> instance.</returns>
    public static ShiftTime Create(int hours, int minutes)
    {
        if (hours < 0 || hours > 23)
        {
            throw new DomainException("Shift time hours must be between 0 and 23.");
        }

        if (minutes < 0 || minutes > 59)
        {
            throw new DomainException("Shift time minutes must be between 0 and 59.");
        }

        return new ShiftTime((hours * 60) + minutes);
    }

    /// <summary>
    /// Creates a validated shift time from total minutes since midnight.
    /// </summary>
    /// <param name="totalMinutes">Total minutes from midnight (0–1439).</param>
    /// <returns>A validated <see cref="ShiftTime"/> instance.</returns>
    public static ShiftTime FromTotalMinutes(int totalMinutes)
    {
        if (totalMinutes < 0 || totalMinutes > 1439)
        {
            throw new DomainException("Shift time must be between 0 and 1439 minutes from midnight.");
        }

        return new ShiftTime(totalMinutes);
    }
}
