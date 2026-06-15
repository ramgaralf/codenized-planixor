// <copyright file="ShiftNameTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftName"/> value object.
/// </summary>
[TestFixture]
public sealed class ShiftNameTests
{
    /// <summary>Verifies creation with valid name succeeds.</summary>
    [Test]
    public void Create_WithValidName_ReturnsShiftNameInstance()
    {
        ShiftName result = ShiftName.Create("Morning Shift");

        Assert.That(result.Value, Is.EqualTo("Morning Shift"));
    }

    /// <summary>Verifies creation trims whitespace.</summary>
    [Test]
    public void Create_WithLeadingAndTrailingWhitespace_TrimsValue()
    {
        ShiftName result = ShiftName.Create("  Night Shift  ");

        Assert.That(result.Value, Is.EqualTo("Night Shift"));
    }

    /// <summary>Verifies creation with exactly 50 characters succeeds.</summary>
    [Test]
    public void Create_WithExactly50Characters_ReturnsShiftNameInstance()
    {
        string name = new string('A', 50);

        ShiftName result = ShiftName.Create(name);

        Assert.That(result.Value, Is.EqualTo(name));
    }

    /// <summary>Verifies creation with single character succeeds.</summary>
    [Test]
    public void Create_WithSingleCharacter_ReturnsShiftNameInstance()
    {
        ShiftName result = ShiftName.Create("A");

        Assert.That(result.Value, Is.EqualTo("A"));
    }

    /// <summary>Verifies creation with null throws DomainException.</summary>
    [Test]
    public void Create_WithNull_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftName.Create(null!));
    }

    /// <summary>Verifies creation with empty string throws DomainException.</summary>
    [Test]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftName.Create(string.Empty));
    }

    /// <summary>Verifies creation with whitespace-only throws DomainException.</summary>
    [Test]
    public void Create_WithWhitespaceOnly_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftName.Create("   "));
    }

    /// <summary>Verifies creation with more than 50 characters after trim throws DomainException.</summary>
    [Test]
    public void Create_WithMoreThan50Characters_ThrowsDomainException()
    {
        string name = new string('A', 51);

        Assert.Throws<DomainException>(() => ShiftName.Create(name));
    }
}
