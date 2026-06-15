// <copyright file="ShiftTimeTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftTime"/> value object.
/// </summary>
[TestFixture]
public sealed class ShiftTimeTests
{
    /// <summary>Verifies creation with valid hours and minutes succeeds.</summary>
    [Test]
    public void Create_WithValidHoursAndMinutes_ReturnsShiftTimeInstance()
    {
        ShiftTime result = ShiftTime.Create(8, 30);

        Assert.Multiple(() =>
        {
            Assert.That(result.Hours, Is.EqualTo(8));
            Assert.That(result.Minutes, Is.EqualTo(30));
            Assert.That(result.TotalMinutes, Is.EqualTo(510));
        });
    }

    /// <summary>Verifies creation with midnight (0:00) succeeds.</summary>
    [Test]
    public void Create_WithMidnight_ReturnsShiftTimeInstance()
    {
        ShiftTime result = ShiftTime.Create(0, 0);

        Assert.That(result.TotalMinutes, Is.EqualTo(0));
    }

    /// <summary>Verifies creation with maximum valid time (23:59) succeeds.</summary>
    [Test]
    public void Create_WithMaximumTime_ReturnsShiftTimeInstance()
    {
        ShiftTime result = ShiftTime.Create(23, 59);

        Assert.That(result.TotalMinutes, Is.EqualTo(1439));
    }

    /// <summary>Verifies creation with hours out of range throws DomainException.</summary>
    [Test]
    public void Create_WithHoursAbove23_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftTime.Create(24, 0));
    }

    /// <summary>Verifies creation with negative hours throws DomainException.</summary>
    [Test]
    public void Create_WithNegativeHours_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftTime.Create(-1, 0));
    }

    /// <summary>Verifies creation with minutes out of range throws DomainException.</summary>
    [Test]
    public void Create_WithMinutesAbove59_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftTime.Create(12, 60));
    }

    /// <summary>Verifies creation with negative minutes throws DomainException.</summary>
    [Test]
    public void Create_WithNegativeMinutes_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftTime.Create(12, -1));
    }

    /// <summary>Verifies FromTotalMinutes with valid value succeeds.</summary>
    [Test]
    public void FromTotalMinutes_WithValidValue_ReturnsShiftTimeInstance()
    {
        ShiftTime result = ShiftTime.FromTotalMinutes(510);

        Assert.Multiple(() =>
        {
            Assert.That(result.Hours, Is.EqualTo(8));
            Assert.That(result.Minutes, Is.EqualTo(30));
        });
    }

    /// <summary>Verifies FromTotalMinutes with negative value throws DomainException.</summary>
    [Test]
    public void FromTotalMinutes_WithNegativeValue_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftTime.FromTotalMinutes(-1));
    }

    /// <summary>Verifies FromTotalMinutes with value above 1439 throws DomainException.</summary>
    [Test]
    public void FromTotalMinutes_WithValueAbove1439_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftTime.FromTotalMinutes(1440));
    }
}
