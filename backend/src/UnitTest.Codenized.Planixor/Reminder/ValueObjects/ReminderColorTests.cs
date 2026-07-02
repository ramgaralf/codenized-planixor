// <copyright file="ReminderColorTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ReminderColor"/> value object.
/// </summary>
[TestFixture]
public sealed class ReminderColorTests
{
    /// <summary>Verifies creation with a valid palette color succeeds.</summary>
    [Test]
    public void Create_WithValidPaletteColor_ReturnsReminderColorInstance()
    {
        ReminderColor result = ReminderColor.Create("#EF4444");

        Assert.That(result.Value, Is.EqualTo("#EF4444"));
    }

    /// <summary>Verifies creation with lowercase hex is case-insensitive and stores uppercase.</summary>
    [Test]
    public void Create_WithLowercaseHex_ReturnsUppercaseValue()
    {
        ReminderColor result = ReminderColor.Create("#ef4444");

        Assert.That(result.Value, Is.EqualTo("#EF4444"));
    }

    /// <summary>Verifies all 45 palette colors are accepted.</summary>
    /// <param name="color">The hex color to test.</param>
    [TestCase("#FCA5A5")]
    [TestCase("#F87171")]
    [TestCase("#EF4444")]
    [TestCase("#DC2626")]
    [TestCase("#991B1B")]
    [TestCase("#FDBA74")]
    [TestCase("#FB923C")]
    [TestCase("#F97316")]
    [TestCase("#EA580C")]
    [TestCase("#9A3412")]
    [TestCase("#FCD34D")]
    [TestCase("#FBBF24")]
    [TestCase("#F59E0B")]
    [TestCase("#D97706")]
    [TestCase("#92400E")]
    [TestCase("#6EE7B7")]
    [TestCase("#34D399")]
    [TestCase("#10B981")]
    [TestCase("#059669")]
    [TestCase("#065F46")]
    [TestCase("#67E8F9")]
    [TestCase("#22D3EE")]
    [TestCase("#0B86D4")]
    [TestCase("#0E7490")]
    [TestCase("#155E75")]
    [TestCase("#93C5FD")]
    [TestCase("#60A5FA")]
    [TestCase("#2563EB")]
    [TestCase("#1D4ED8")]
    [TestCase("#1E3A8A")]
    [TestCase("#C4B5FD")]
    [TestCase("#A78BFA")]
    [TestCase("#7C3AED")]
    [TestCase("#6D28D9")]
    [TestCase("#4C1D95")]
    [TestCase("#F9A8D4")]
    [TestCase("#F472B6")]
    [TestCase("#EC4899")]
    [TestCase("#DB2777")]
    [TestCase("#9D174D")]
    [TestCase("#D1D5DB")]
    [TestCase("#9CA3AF")]
    [TestCase("#6B7280")]
    [TestCase("#4B5563")]
    [TestCase("#1F2937")]
    public void Create_WithEachPaletteColor_ReturnsReminderColorInstance(string color)
    {
        ReminderColor result = ReminderColor.Create(color);

        Assert.That(result.Value, Is.EqualTo(color.ToUpperInvariant()));
    }

    /// <summary>Verifies creation with null throws DomainException.</summary>
    [Test]
    public void Create_WithNull_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderColor.Create(null!));
    }

    /// <summary>Verifies creation with empty string throws DomainException.</summary>
    [Test]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderColor.Create(string.Empty));
    }

    /// <summary>Verifies creation with a color not in the palette throws DomainException.</summary>
    [Test]
    public void Create_WithColorNotInPalette_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderColor.Create("#FFFFFF"));
    }

    /// <summary>Verifies creation with whitespace throws DomainException.</summary>
    [Test]
    public void Create_WithWhitespace_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderColor.Create("   "));
    }
}
