// <copyright file="HoursWorkedPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for <see cref="HoursWorked.Calculate"/> method.
/// Feature: gh3-shift-management, Property 3: Hours worked calculation.
/// </summary>
/// <remarks>
/// <strong>Validates: Requirements 1.3, 9.1, 9.4</strong>
/// </remarks>
[TestFixture]
[Category("Feature: gh3-shift-management, Property 3: Hours worked calculation")]
public sealed class HoursWorkedPropertyTests
{
    /// <summary>
    /// For any pair of equal ShiftTime values, Calculate returns 1440 minutes (24 hours).
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.3, 9.1, 9.4</strong>
    /// </remarks>
    /// <param name="input">A valid total minutes value.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ValidTotalMinutesArbitrary) })]
    [Category("Property 3: Hours worked calculation")]
    public void Calculate_WithEqualTimes_Returns1440(ValidTotalMinutesInput input)
    {
        ShiftTime start = ShiftTime.FromTotalMinutes(input.TotalMinutes);
        ShiftTime end = ShiftTime.FromTotalMinutes(input.TotalMinutes);

        HoursWorked result = HoursWorked.Calculate(start, end);

        Assert.That(result.TotalMinutes, Is.EqualTo(1440), $"Expected 1440 for totalMinutes={input.TotalMinutes}");
    }

    /// <summary>
    /// For any pair of unequal ShiftTime values, Calculate returns (endTime - startTime + 1440) % 1440.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.3, 9.1, 9.4</strong>
    /// </remarks>
    /// <param name="input">A pair of unequal total minutes values.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(UnequalTimePairArbitrary) })]
    [Category("Property 3: Hours worked calculation")]
    public void Calculate_WithUnequalTimes_ReturnsModularDuration(UnequalTimePairInput input)
    {
        ShiftTime start = ShiftTime.FromTotalMinutes(input.StartMinutes);
        ShiftTime end = ShiftTime.FromTotalMinutes(input.EndMinutes);

        HoursWorked result = HoursWorked.Calculate(start, end);

        int expected = ((input.EndMinutes - input.StartMinutes) + 1440) % 1440;

        Assert.That(result.TotalMinutes, Is.EqualTo(expected), $"Expected {expected} for start={input.StartMinutes}, end={input.EndMinutes}");
    }

    /// <summary>
    /// For any pair of valid ShiftTime values, the result is always positive and in range [1, 1440].
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.3, 9.1, 9.4</strong>
    /// </remarks>
    /// <param name="input">A pair of total minutes values.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(AnyTimePairArbitrary) })]
    [Category("Property 3: Hours worked calculation")]
    public void Calculate_WithAnyValidTimes_ResultIsInRange1To1440(AnyTimePairInput input)
    {
        ShiftTime start = ShiftTime.FromTotalMinutes(input.StartMinutes);
        ShiftTime end = ShiftTime.FromTotalMinutes(input.EndMinutes);

        HoursWorked result = HoursWorked.Calculate(start, end);

        Assert.That(result.TotalMinutes, Is.InRange(1, 1440), $"Result {result.TotalMinutes} out of range for start={input.StartMinutes}, end={input.EndMinutes}");
    }

    // ==================== Wrapper types ====================

    /// <summary>Wrapper for valid total minutes input.</summary>
    /// <param name="TotalMinutes">A valid total minutes value (0–1439).</param>
    public record ValidTotalMinutesInput(int TotalMinutes);

    /// <summary>Wrapper for unequal time pair input.</summary>
    /// <param name="StartMinutes">Start total minutes.</param>
    /// <param name="EndMinutes">End total minutes (different from start).</param>
    public record UnequalTimePairInput(int StartMinutes, int EndMinutes);

    /// <summary>Wrapper for any time pair input.</summary>
    /// <param name="StartMinutes">Start total minutes.</param>
    /// <param name="EndMinutes">End total minutes.</param>
    public record AnyTimePairInput(int StartMinutes, int EndMinutes);

    // ==================== Arbitrary classes ====================

    /// <summary>Provides arbitrary for valid total minutes values (0–1439).</summary>
    public sealed class ValidTotalMinutesArbitrary
    {
        /// <summary>Generates valid total minutes.</summary>
        /// <returns>An arbitrary for <see cref="ValidTotalMinutesInput"/>.</returns>
        public static Arbitrary<ValidTotalMinutesInput> Generate()
        {
            Gen<ValidTotalMinutesInput> gen = Gen.Choose(0, 1439)
                .Select(m => new ValidTotalMinutesInput(m));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for unequal time pairs (0–1439, start != end).</summary>
    public sealed class UnequalTimePairArbitrary
    {
        /// <summary>Generates unequal time pairs.</summary>
        /// <returns>An arbitrary for <see cref="UnequalTimePairInput"/>.</returns>
        public static Arbitrary<UnequalTimePairInput> Generate()
        {
            Gen<UnequalTimePairInput> gen =
                from start in Gen.Choose(0, 1439)
                from end in Gen.Choose(0, 1439)
                where start != end
                select new UnequalTimePairInput(start, end);

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for any time pair (0–1439).</summary>
    public sealed class AnyTimePairArbitrary
    {
        /// <summary>Generates any valid time pair.</summary>
        /// <returns>An arbitrary for <see cref="AnyTimePairInput"/>.</returns>
        public static Arbitrary<AnyTimePairInput> Generate()
        {
            Gen<AnyTimePairInput> gen =
                from start in Gen.Choose(0, 1439)
                from end in Gen.Choose(0, 1439)
                select new AnyTimePairInput(start, end);

            return gen.ToArbitrary();
        }
    }
}
