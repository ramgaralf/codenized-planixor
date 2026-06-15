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

    // ==================== Wrapper types for FsCheck generation ====================

    /// <summary>Wrapper for valid reminder name inputs (1–50 chars after trim).</summary>
    /// <param name="Value">The valid name string.</param>
    public record ValidReminderNameInput(string Value);

    /// <summary>Wrapper for valid names with surrounding whitespace.</summary>
    /// <param name="Value">The name string with leading/trailing whitespace.</param>
    public record ValidNameWithWhitespaceInput(string Value);

    /// <summary>Wrapper for empty or whitespace-only inputs.</summary>
    /// <param name="Value">The empty or whitespace-only string.</param>
    public record EmptyOrWhitespaceInput(string Value);

    /// <summary>Wrapper for names exceeding 50 characters after trim.</summary>
    /// <param name="Value">The too-long name string.</param>
    public record TooLongReminderNameInput(string Value);

    // ==================== Arbitrary classes ====================

    /// <summary>Provides arbitrary for valid reminder names (1–50 chars, not whitespace-only).</summary>
    public sealed class ValidReminderNameArbitrary
    {
        /// <summary>Generates valid reminder names (1–50 chars after trim, containing at least one non-whitespace character).</summary>
        /// <returns>An arbitrary for <see cref="ValidReminderNameInput"/>.</returns>
        public static Arbitrary<ValidReminderNameInput> Generate()
        {
            Gen<char> nameChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
                'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
                'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
                '8', '9', ' ', '-', '_');

            Gen<ValidReminderNameInput> gen = Gen.Choose(1, 50)
                .SelectMany(length => nameChar.ArrayOf(length))
                .Select(chars => new string(chars))
                .Where(s => !string.IsNullOrWhiteSpace(s) && s.Trim().Length >= 1 && s.Trim().Length <= 50)
                .Select(s => new ValidReminderNameInput(s));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for valid names surrounded by whitespace.</summary>
    public sealed class ValidNameWithWhitespaceArbitrary
    {
        /// <summary>Generates valid names with leading and trailing whitespace added.</summary>
        /// <returns>An arbitrary for <see cref="ValidNameWithWhitespaceInput"/>.</returns>
        public static Arbitrary<ValidNameWithWhitespaceInput> Generate()
        {
            Gen<char> contentChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

            Gen<ValidNameWithWhitespaceInput> gen =
                from length in Gen.Choose(1, 48)
                from chars in contentChar.ArrayOf(length)
                from leadingSpaces in Gen.Choose(1, 5)
                from trailingSpaces in Gen.Choose(1, 5)
                let content = new string(chars)
                let padded = new string(' ', leadingSpaces) + content + new string(' ', trailingSpaces)
                select new ValidNameWithWhitespaceInput(padded);

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for empty or whitespace-only strings.</summary>
    public sealed class EmptyOrWhitespaceArbitrary
    {
        /// <summary>Generates empty strings or strings containing only whitespace characters.</summary>
        /// <returns>An arbitrary for <see cref="EmptyOrWhitespaceInput"/>.</returns>
        public static Arbitrary<EmptyOrWhitespaceInput> Generate()
        {
            Gen<char> whitespaceChar = Gen.Elements(' ', '\t', '\n', '\r');

            Gen<EmptyOrWhitespaceInput> gen = Gen.OneOf(
                Gen.Constant(new EmptyOrWhitespaceInput(string.Empty)),
                Gen.Choose(1, 20)
                    .SelectMany(length => whitespaceChar.ArrayOf(length))
                    .Select(chars => new EmptyOrWhitespaceInput(new string(chars))));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for names exceeding 50 characters after trimming.</summary>
    public sealed class TooLongReminderNameArbitrary
    {
        /// <summary>Generates names that exceed 50 characters after trimming.</summary>
        /// <returns>An arbitrary for <see cref="TooLongReminderNameInput"/>.</returns>
        public static Arbitrary<TooLongReminderNameInput> Generate()
        {
            Gen<char> alphanumericChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

            Gen<TooLongReminderNameInput> gen = Gen.Choose(51, 200)
                .SelectMany(length => alphanumericChar.ArrayOf(length))
                .Select(chars => new TooLongReminderNameInput(new string(chars)));

            return gen.ToArbitrary();
        }
    }
}
