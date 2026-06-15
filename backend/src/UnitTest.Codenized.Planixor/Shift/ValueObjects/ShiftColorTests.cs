// <copyright file="ShiftColorTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftColor"/> value object.
/// </summary>
[TestFixture]
public sealed class ShiftColorTests
{
    /// <summary>Verifies creation with a valid palette color succeeds.</summary>
    [Test]
    public void Create_WithValidPaletteColor_ReturnsShiftColorInstance()
    {
        ShiftColor result = ShiftColor.Create("#EF4444");

        Assert.That(result.Value, Is.EqualTo("#EF4444"));
    }

    /// <summary>Verifies creation with lowercase hex is case-insensitive and stores uppercase.</summary>
    [Test]
    public void Create_WithLowercaseHex_ReturnsUppercaseValue()
    {
        ShiftColor result = ShiftColor.Create("#ef4444");

        Assert.That(result.Value, Is.EqualTo("#EF4444"));
    }

    /// <summary>Verifies all palette colors are accepted.</summary>
    /// <param name="color">The hex color to test.</param>
    [TestCase("#EF4444")]
    [TestCase("#F97316")]
    [TestCase("#F59E0B")]
    [TestCase("#10B981")]
    [TestCase("#0B86D4")]
    [TestCase("#2563EB")]
    [TestCase("#7C3AED")]
    [TestCase("#EC4899")]
    [TestCase("#6B7280")]
    [TestCase("#1F2937")]
    public void Create_WithEachPaletteColor_ReturnsShiftColorInstance(string color)
    {
        ShiftColor result = ShiftColor.Create(color);

        Assert.That(result.Value, Is.EqualTo(color.ToUpperInvariant()));
    }

    /// <summary>Verifies creation with null throws DomainException.</summary>
    [Test]
    public void Create_WithNull_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftColor.Create(null!));
    }

    /// <summary>Verifies creation with empty string throws DomainException.</summary>
    [Test]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftColor.Create(string.Empty));
    }

    /// <summary>Verifies creation with a color not in the palette throws DomainException.</summary>
    [Test]
    public void Create_WithColorNotInPalette_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftColor.Create("#FFFFFF"));
    }
}
