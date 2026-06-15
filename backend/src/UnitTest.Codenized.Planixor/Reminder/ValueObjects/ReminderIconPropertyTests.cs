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
    private static readonly string[] SingleEmojis =
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

    // ==================== Wrapper types for FsCheck generation ====================

    /// <summary>Wrapper for valid single emoji inputs.</summary>
    /// <param name="Value">The valid single emoji string.</param>
    public record ValidSingleEmojiInput(string Value);

    /// <summary>Wrapper for strings with multiple text elements.</summary>
    /// <param name="Value">The multi-element string.</param>
    public record MultipleTextElementsInput(string Value);

    /// <summary>Wrapper for strings with multiple emojis concatenated.</summary>
    /// <param name="Value">The multi-emoji string.</param>
    public record MultipleEmojisInput(string Value);

    // ==================== Arbitrary classes ====================

    /// <summary>Provides arbitrary for valid single emoji inputs.</summary>
    public sealed class ValidSingleEmojiArbitrary
    {
        /// <summary>Generates valid single emoji strings (exactly one text element).</summary>
        /// <returns>An arbitrary for <see cref="ValidSingleEmojiInput"/>.</returns>
        public static Arbitrary<ValidSingleEmojiInput> Generate()
        {
            Gen<ValidSingleEmojiInput> gen = Gen.Elements<string>(SingleEmojis)
                .Select(e => new ValidSingleEmojiInput(e));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for strings with multiple text elements (non-emoji characters).</summary>
    public sealed class MultipleTextElementsArbitrary
    {
        /// <summary>Generates strings with multiple ASCII characters (each is one text element).</summary>
        /// <returns>An arbitrary for <see cref="MultipleTextElementsInput"/>.</returns>
        public static Arbitrary<MultipleTextElementsInput> Generate()
        {
            Gen<char> asciiChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

            Gen<MultipleTextElementsInput> gen = Gen.Choose(2, 10)
                .SelectMany(length => asciiChar.ArrayOf(length))
                .Select(chars => new MultipleTextElementsInput(new string(chars)));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for strings with multiple emojis concatenated.</summary>
    public sealed class MultipleEmojisArbitrary
    {
        /// <summary>Generates strings with 2–5 emojis concatenated together.</summary>
        /// <returns>An arbitrary for <see cref="MultipleEmojisInput"/>.</returns>
        public static Arbitrary<MultipleEmojisInput> Generate()
        {
            Gen<string> emojiGen = Gen.Elements<string>(SingleEmojis);

            Gen<MultipleEmojisInput> gen = Gen.Choose(2, 5)
                .SelectMany(count => emojiGen.ArrayOf(count))
                .Select(emojis => new MultipleEmojisInput(string.Concat(emojis)));

            return gen.ToArbitrary();
        }
    }
}
