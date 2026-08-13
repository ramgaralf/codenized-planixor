// <copyright file="HoursWorked.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents the validated hours worked for a shift in total minutes (1–1440).
/// </summary>
/// <remarks>
/// Zero is not a value this type can hold: a shift of no duration is not something the product can represent. The
/// range used to start at zero, which let a zero-minute shift through <see cref="Create"/> and into storage.
/// </remarks>
public record HoursWorked
{
    /// <summary>The shortest shift that can be represented, in minutes.</summary>
    public const int MinimumMinutes = 1;

    /// <summary>The longest shift that can be represented, in minutes: a full day.</summary>
    public const int MaximumMinutes = 1440;

    /// <summary>
    /// Gets the total minutes worked (1–1440).
    /// </summary>
    public int TotalMinutes { get; }

    private HoursWorked(int totalMinutes)
    {
        this.TotalMinutes = totalMinutes;
    }

    /// <summary>
    /// Creates a validated hours worked value.
    /// </summary>
    /// <param name="totalMinutes">Total minutes worked (1–1440).</param>
    /// <returns>A validated <see cref="HoursWorked"/> instance.</returns>
    /// <exception cref="DomainException">Thrown when the duration is outside the representable range.</exception>
    public static HoursWorked Create(int totalMinutes)
    {
        if (totalMinutes < MinimumMinutes || totalMinutes > MaximumMinutes)
        {
            throw new DomainException($"Hours worked must be between {MinimumMinutes} and {MaximumMinutes} minutes.");
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
            return Create(MaximumMinutes);
        }

        // Both times are within a day and differ, so the wrapped difference is always between 1 and 1439 — this
        // path cannot produce a zero-length shift. Routed through Create anyway, so the range has a single gate.
        int duration = ((endTime.TotalMinutes - startTime.TotalMinutes) + MaximumMinutes) % MaximumMinutes;
        return Create(duration);
    }
}
