// <copyright file="ReminderIconPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using System.Globalization;
using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for ReminderIcon value object — Property 15: Icon validation accepts exactly one emoji.
/// Feature: gh5-reminder-management, Property 15: Icon validation accepts exactly one emoji.
/// </summary>
/// <remarks>
/// <strong>Validates: Requirements 7.2</strong>
/// </remarks>
[TestFixture]
[Category("Feature: gh5-reminder-management, Property 15: Icon validation accepts exactly one emoji")]
public sealed class ReminderIconPropertyTests
{
    internal static readonly string[] SingleEmojis =
    [
        "\U0001F514", "\u23F0", "\U0001F4BC", "\u2600", "\U0001F680",
        "\U0001F3E0", "\U0001F4A1", "\U0001F30D", "\U0001F525", "\u2764",
        "\U0001F4DA", "\U0001F3AF", "\U0001F60A", "\U0001F44D", "\U0001F381",
        "\U0001F4E7", "\U0001F3B5", "\U0001F4A4", "\U0001F340", "\U0001F308",
    ];

    // ==================== Valid inputs — accepted ====================

    /// <summary>
    /// For any single emoji string (exactly one text element), ReminderIcon.Create() succeeds
    /// and returns the emoji value unchanged.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.2</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidSingleEmojiArbitrary)])]
    [Category("Property 15: Icon validation accepts exactly one emoji")]
    public void Create_WithSingleEmoji_SucceedsAndPreservesValue(ValidSingleEmojiInput input)
    {
        ReminderIcon result = ReminderIcon.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value));

        StringInfo stringInfo = new StringInfo(result.Value);
        Assert.That(stringInfo.LengthInTextElements, Is.EqualTo(1));
    }

    // ==================== Invalid inputs — rejected ====================

    /// <summary>
    /// For any empty string input, ReminderIcon.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.2</strong>
    /// </remarks>
    [Test]
    [Category("Property 15: Icon validation accepts exactly one emoji")]
    public void Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create(string.Empty));
    }

    /// <summary>
    /// For any string with multiple text elements (multiple emojis or multiple characters),
    /// ReminderIcon.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.2</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(MultipleTextElementsArbitrary)])]
    [Category("Property 15: Icon validation accepts exactly one emoji")]
    public void Create_WithMultipleTextElements_ThrowsDomainException(MultipleTextElementsInput input)
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create(input.Value));
    }

    /// <summary>
    /// For any string consisting of multiple emojis concatenated together,
    /// ReminderIcon.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.2</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(MultipleEmojisArbitrary)])]
    [Category("Property 15: Icon validation accepts exactly one emoji")]
    public void Create_WithMultipleEmojis_ThrowsDomainException(MultipleEmojisInput input)
    {
        Assert.Throws<DomainException>(() => ReminderIcon.Create(input.Value));
    }
}
