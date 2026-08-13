// <copyright file="HoursWorkedCreateRangePropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Property-based tests for <see cref="HoursWorked.Create"/> method — full range 0–1440.
/// Feature: gh18-calendar-shift-reminder-improvements, Property 1: HoursWorked accepts full range 1-1440.
/// </summary>
/// <remarks>
/// <strong>Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1, 2.3</strong>
/// </remarks>
[TestFixture]
[Category("Feature: gh18-calendar-shift-reminder-improvements, Property 1: HoursWorked accepts full range 1-1440")]
public sealed class HoursWorkedCreateRangePropertyTests
{
    /// <summary>
    /// For any integer in [1, 1440], HoursWorked.Create() succeeds and returns the correct TotalMinutes.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1, 2.3</strong>
    /// </remarks>
    /// <param name="input">A valid total minutes value in [1, 1440].</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ValidCreateRangeArbitrary) })]
    [Category("Property 1: HoursWorked accepts full range 1-1440")]
    public void Create_WithValueInRange1To1440_SucceedsAndReturnsCorrectTotalMinutes(ValidCreateRangeInput input)
    {
        HoursWorked result = HoursWorked.Create(input.TotalMinutes);

        Assert.That(result.TotalMinutes, Is.EqualTo(input.TotalMinutes), $"Expected TotalMinutes={input.TotalMinutes}");
    }

    /// <summary>
    /// For any integer outside [1, 1440] — zero included, since a shift of no duration is not representable — HoursWorked.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1, 2.3</strong>
    /// </remarks>
    /// <param name="input">An invalid total minutes value outside [1, 1440].</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(InvalidCreateRangeArbitrary) })]
    [Category("Property 1: HoursWorked accepts full range 1-1440")]
    public void Create_WithValueOutsideRange1To1440_ThrowsDomainException(InvalidCreateRangeInput input)
    {
        Assert.Throws<DomainException>(() => HoursWorked.Create(input.TotalMinutes));
    }
}
