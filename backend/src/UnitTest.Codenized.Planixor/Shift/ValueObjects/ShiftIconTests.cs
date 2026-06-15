// <copyright file="ShiftIconTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftIcon"/> value object.
/// </summary>
[TestFixture]
public sealed class ShiftIconTests
{
    /// <summary>Verifies creation with a single emoji succeeds.</summary>
    [Test]
    public void Create_WithSingleEmoji_ReturnsShiftIconInstance()
    {
        ShiftIcon result = ShiftIcon.Create("\U0001F4BC");

        Assert.That(result.Value, Is.EqualTo("\U0001F4BC"));
    }

    /// <summary>Verifies creation with another emoji succeeds.</summary>
    [Test]
    public void Create_WithSunEmoji_ReturnsShiftIconInstance()
    {
        ShiftIcon result = ShiftIcon.Create("\u2600");

        Assert.That(result.Value, Is.EqualTo("\u2600"));
    }

    /// <summary>Verifies creation with null throws DomainException.</summary>
    [Test]
    public void Create_WithNull_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftIcon.Create(null!));
    }

    /// <summary>Verifies creation with empty string throws DomainException.</summary>
    [Test]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftIcon.Create(string.Empty));
    }

    /// <summary>Verifies creation with multiple emojis throws DomainException.</summary>
    [Test]
    public void Create_WithMultipleEmojis_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftIcon.Create("\U0001F4BC\U0001F4BC"));
    }

    /// <summary>Verifies creation with regular text throws DomainException.</summary>
    [Test]
    public void Create_WithMultipleCharacters_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftIcon.Create("AB"));
    }
}
