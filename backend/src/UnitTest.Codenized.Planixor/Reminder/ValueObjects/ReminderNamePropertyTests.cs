// <copyright file="ReminderNamePropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for ReminderName value object — Property 14: Name validation accepts trimmed strings of 1–50 characters.
/// Feature: gh5-reminder-management, Property 14: Name validation accepts trimmed strings of 1–50 characters.
/// </summary>
/// <remarks>
/// <strong>Validates: Requirements 7.1</strong>
/// </remarks>
[TestFixture]
[Category("Feature: gh5-reminder-management, Property 14: Name validation accepts trimmed strings of 1–50 characters")]
public sealed class ReminderNamePropertyTests
{
    // ==================== Valid inputs — accepted ====================

    /// <summary>
    /// For any trimmed string with length between 1 and 50 characters, ReminderName.Create() succeeds
    /// and returns the trimmed value.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidReminderNameArbitrary)])]
    [Category("Property 14: Name validation accepts trimmed strings of 1–50 characters")]
    public void Create_WithValidTrimmedName1To50Chars_Succeeds(ValidReminderNameInput input)
    {
        ReminderName result = ReminderName.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value.Trim()));
        Assert.That(result.Value.Length, Is.InRange(1, 50));
    }

    /// <summary>
    /// For any valid name with surrounding whitespace, ReminderName.Create() trims the value
    /// and stores only the trimmed result.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidNameWithWhitespaceArbitrary)])]
    [Category("Property 14: Name validation accepts trimmed strings of 1–50 characters")]
    public void Create_WithValidNameSurroundedByWhitespace_TrimsAndSucceeds(ValidNameWithWhitespaceInput input)
    {
        ReminderName result = ReminderName.Create(input.Value);

        string expectedTrimmed = input.Value.Trim();
        Assert.That(result.Value, Is.EqualTo(expectedTrimmed));
        Assert.That(result.Value.Length, Is.InRange(1, 50));
    }

    // ==================== Invalid inputs — rejected ====================

    /// <summary>
    /// For any input that is empty or whitespace-only, ReminderName.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(EmptyOrWhitespaceArbitrary)])]
    [Category("Property 14: Name validation accepts trimmed strings of 1–50 characters")]
    public void Create_WithEmptyOrWhitespaceOnly_ThrowsDomainException(EmptyOrWhitespaceInput input)
    {
        Assert.Throws<DomainException>(() => ReminderName.Create(input.Value));
    }

    /// <summary>
    /// For any input that exceeds 50 characters after trim, ReminderName.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(TooLongReminderNameArbitrary)])]
    [Category("Property 14: Name validation accepts trimmed strings of 1–50 characters")]
    public void Create_WithMoreThan50CharsAfterTrim_ThrowsDomainException(TooLongReminderNameInput input)
    {
        Assert.Throws<DomainException>(() => ReminderName.Create(input.Value));
    }
}
