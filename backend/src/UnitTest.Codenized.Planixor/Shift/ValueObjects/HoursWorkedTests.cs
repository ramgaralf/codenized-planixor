// <copyright file="HoursWorkedTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="HoursWorked"/> value object.
/// </summary>
[TestFixture]
public sealed class HoursWorkedTests
{
    /// <summary>Verifies creation with valid minutes succeeds.</summary>
    [Test]
    public void Create_WithValidMinutes_ReturnsHoursWorkedInstance()
    {
        HoursWorked result = HoursWorked.Create(480);

        Assert.That(result.TotalMinutes, Is.EqualTo(480));
    }

    /// <summary>Verifies creation with minimum value (1) succeeds.</summary>
    [Test]
    public void Create_WithMinimumValue_ReturnsHoursWorkedInstance()
    {
        HoursWorked result = HoursWorked.Create(1);

        Assert.That(result.TotalMinutes, Is.EqualTo(1));
    }

    /// <summary>Verifies creation with maximum value (1440) succeeds.</summary>
    [Test]
    public void Create_WithMaximumValue_ReturnsHoursWorkedInstance()
    {
        HoursWorked result = HoursWorked.Create(1440);

        Assert.That(result.TotalMinutes, Is.EqualTo(1440));
    }

    /// <summary>Verifies creation with zero succeeds.</summary>
    [Test]
    public void Create_WithZero_ReturnsHoursWorkedInstance()
    {
        HoursWorked result = HoursWorked.Create(0);

        Assert.That(result.TotalMinutes, Is.EqualTo(0));
    }

    /// <summary>Verifies creation with negative value throws DomainException.</summary>
    [Test]
    public void Create_WithNegativeValue_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => HoursWorked.Create(-1));
    }

    /// <summary>Verifies creation with value above 1440 throws DomainException.</summary>
    [Test]
    public void Create_WithValueAbove1440_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => HoursWorked.Create(1441));
    }

    /// <summary>Verifies calculate with equal times returns 1440 minutes (24 hours).</summary>
    [Test]
    public void Calculate_WithEqualTimes_Returns1440()
    {
        ShiftTime start = ShiftTime.Create(8, 0);
        ShiftTime end = ShiftTime.Create(8, 0);

        HoursWorked result = HoursWorked.Calculate(start, end);

        Assert.That(result.TotalMinutes, Is.EqualTo(1440));
    }

    /// <summary>Verifies calculate with end after start returns correct duration.</summary>
    [Test]
    public void Calculate_WithEndAfterStart_ReturnsCorrectDuration()
    {
        ShiftTime start = ShiftTime.Create(8, 0);
        ShiftTime end = ShiftTime.Create(16, 0);

        HoursWorked result = HoursWorked.Calculate(start, end);

        Assert.That(result.TotalMinutes, Is.EqualTo(480));
    }

    /// <summary>Verifies calculate with end before start (crossing midnight) returns correct duration.</summary>
    [Test]
    public void Calculate_WithEndBeforeStart_ReturnsCrossMidnightDuration()
    {
        ShiftTime start = ShiftTime.Create(22, 0);
        ShiftTime end = ShiftTime.Create(6, 0);

        HoursWorked result = HoursWorked.Calculate(start, end);

        Assert.That(result.TotalMinutes, Is.EqualTo(480));
    }
}
