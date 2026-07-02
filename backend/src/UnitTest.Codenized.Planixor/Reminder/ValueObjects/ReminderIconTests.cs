// <copyright file="ReminderIconTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ReminderIcon"/> value object.
/// </summary>
[TestFixture]
public sealed class ReminderIconTests
{
    /// <summary>Verifies creation with a single emoji succeeds.</summary>
    [Test]
    public void Create_WithSingleEmoji_ReturnsReminderIconInstance()
    {
        ReminderIcon result = ReminderIcon.Create("\U0001F514");

        Assert.That(result.Value, Is.EqualTo("\U0001F514"));
    }

    /// <summary>Verifies creation with another emoji succeeds.</summary>
    [Test]
    public void Create_WithAlarmClockEmoji_ReturnsReminderIconInstance()
    {
        ReminderIcon result = ReminderIcon.Create("\u23F0");

        Assert.That(result.Value, Is.EqualTo("\u23F0"));
    }

    /// <summary>Verifies creation with null throws DomainException.</summary>
    [Test]
    public void Create_WithNull_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create(null!));
    }

    /// <summary>Verifies creation with empty string throws DomainException.</summary>
    [Test]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create(string.Empty));
    }

    /// <summary>Verifies creation with multiple emojis throws DomainException.</summary>
    [Test]
    public void Create_WithMultipleEmojis_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create("\U0001F514\U0001F514"));
    }

    /// <summary>Verifies creation with regular text throws DomainException.</summary>
    [Test]
    public void Create_WithMultipleCharacters_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create("AB"));
    }
}
