// <copyright file="HoursWorked.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents the validated hours worked for a shift in total minutes (0–1440).
/// </summary>
public record HoursWorked
{
    /// <summary>
    /// Gets the total minutes worked (0–1440).
    /// </summary>
    public int TotalMinutes { get; }

    private HoursWorked(int totalMinutes)
    {
        this.TotalMinutes = totalMinutes;
    }

    /// <summary>
    /// Creates a validated hours worked value.
    /// </summary>
    /// <param name="totalMinutes">Total minutes worked (0–1440).</param>
    /// <returns>A validated <see cref="HoursWorked"/> instance.</returns>
    public static HoursWorked Create(int totalMinutes)
    {
        if (totalMinutes < 0 || totalMinutes > 1440)
        {
            throw new DomainException("Hours worked must be between 0 and 1440 minutes.");
        }

        return new HoursWorked(totalMinutes);
    }

    /// <summary>
    /// Calculates hours worked from start and end times.
    /// If start equals end, returns 1440 (24 hours).
    /// Otherwise, calculates the forward duration treating end before start as crossing midnight.
    /// </summary>
    /// <param name="startTime">The shift start time.</param>
    /// <param name="endTime">The shift end time.</param>
    /// <returns>A validated <see cref="HoursWorked"/> instance.</returns>
    public static HoursWorked Calculate(ShiftTime startTime, ShiftTime endTime)
    {
        if (startTime.TotalMinutes == endTime.TotalMinutes)
        {
            return new HoursWorked(1440);
        }

        int duration = ((endTime.TotalMinutes - startTime.TotalMinutes) + 1440) % 1440;
        return new HoursWorked(duration);
    }
}
