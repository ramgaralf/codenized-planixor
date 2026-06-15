// <copyright file="ReminderNameTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ReminderName"/> value object.
/// </summary>
[TestFixture]
public sealed class ReminderNameTests
{
    /// <summary>Verifies creation with valid name succeeds.</summary>
    [Test]
    public void Create_WithValidName_ReturnsReminderNameInstance()
    {
        ReminderName result = ReminderName.Create("Take Medicine");

        Assert.That(result.Value, Is.EqualTo("Take Medicine"));
    }

    /// <summary>Verifies creation trims whitespace.</summary>
    [Test]
    public void Create_WithLeadingAndTrailingWhitespace_TrimsValue()
    {
        ReminderName result = ReminderName.Create("  Daily Standup  ");

        Assert.That(result.Value, Is.EqualTo("Daily Standup"));
    }

    /// <summary>Verifies creation with exactly 50 characters succeeds.</summary>
    [Test]
    public void Create_WithExactly50Characters_ReturnsReminderNameInstance()
    {
        string name = new string('A', 50);

        ReminderName result = ReminderName.Create(name);

        Assert.That(result.Value, Is.EqualTo(name));
    }

    /// <summary>Verifies creation with single character succeeds.</summary>
    [Test]
    public void Create_WithSingleCharacter_ReturnsReminderNameInstance()
    {
        ReminderName result = ReminderName.Create("A");

        Assert.That(result.Value, Is.EqualTo("A"));
    }

    /// <summary>Verifies creation with null throws DomainException.</summary>
    [Test]
    public void Create_WithNull_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderName.Create(null!));
    }

    /// <summary>Verifies creation with empty string throws DomainException.</summary>
    [Test]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderName.Create(string.Empty));
    }

    /// <summary>Verifies creation with whitespace-only throws DomainException.</summary>
    [Test]
    public void Create_WithWhitespaceOnly_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderName.Create("   "));
    }

    /// <summary>Verifies creation with more than 50 characters after trim throws DomainException.</summary>
    [Test]
    public void Create_WithMoreThan50Characters_ThrowsDomainException()
    {
        string name = new string('A', 51);

        Assert.Throws<DomainException>(() => ReminderName.Create(name));
    }
}
