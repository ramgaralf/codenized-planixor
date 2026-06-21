// <copyright file="ValueObjectsValidationPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for Value Object validation — Property 2: Shift validation rejects invalid input.
/// Feature: gh3-shift-management, Property 2: Shift validation rejects invalid input.
/// </summary>
/// <remarks>
/// <strong>Validates: Requirements 1.2, 1.6, 7.1, 7.2, 7.3, 7.4, 7.5</strong>
/// </remarks>
[TestFixture]
[Category("Feature: gh3-shift-management, Property 2: Shift validation rejects invalid input")]
public sealed class ValueObjectsValidationPropertyTests
{
    private static readonly string[] PaletteColors =
    [
        "#EF4444", "#F97316", "#F59E0B", "#10B981", "#0B86D4",
        "#2563EB", "#7C3AED", "#EC4899", "#6B7280", "#1F2937",
    ];

    private static readonly string[] ValidEmojis =
    [
        "\U0001F4BC", "\u2600", "\U0001F680", "\U0001F3E0", "\U0001F4A1",
        "\U0001F30D", "\U0001F525", "\u2764", "\U0001F4DA", "\U0001F3AF",
    ];

    // ==================== ShiftName — invalid inputs ====================

    /// <summary>
    /// For any input that is empty or whitespace-only, ShiftName.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(WhitespaceOnlyArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftName_Create_WithWhitespaceOnly_ThrowsDomainException(WhitespaceOnlyString input)
    {
        Assert.Throws<DomainException>(() => ShiftName.Create(input.Value));
    }

    /// <summary>
    /// For any input that exceeds 50 characters after trim, ShiftName.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 1.6, 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(TooLongNameArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftName_Create_WithMoreThan50CharsAfterTrim_ThrowsDomainException(TooLongName input)
    {
        Assert.Throws<DomainException>(() => ShiftName.Create(input.Value));
    }

    /// <summary>
    /// For any valid name (1–50 chars after trim, not whitespace-only), ShiftName.Create() succeeds.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.1</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidShiftNameArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftName_Create_WithValidName_Succeeds(ValidShiftNameInput input)
    {
        ShiftName result = ShiftName.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value.Trim()));
    }

    // ==================== ShiftIcon — invalid inputs ====================

    /// <summary>
    /// For any input that is empty, ShiftIcon.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.2</strong>
    /// </remarks>
    [Test]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftIcon_Create_WithEmptyString_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => ShiftIcon.Create(string.Empty));
    }

    /// <summary>
    /// For any input with LengthInTextElements != 1, ShiftIcon.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.2</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(MultipleTextElementsArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftIcon_Create_WithMultipleTextElements_ThrowsDomainException(MultipleTextElementsString input)
    {
        Assert.Throws<DomainException>(() => ShiftIcon.Create(input.Value));
    }

    /// <summary>
    /// For any valid single emoji, ShiftIcon.Create() succeeds.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.2</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidEmojiArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftIcon_Create_WithValidSingleEmoji_Succeeds(ValidEmojiInput input)
    {
        ShiftIcon result = ShiftIcon.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value));
    }

    // ==================== ShiftColor — invalid inputs ====================

    /// <summary>
    /// For any color string not in the predefined palette, ShiftColor.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.3</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(InvalidColorArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftColor_Create_WithColorNotInPalette_ThrowsDomainException(InvalidColorInput input)
    {
        Assert.Throws<DomainException>(() => ShiftColor.Create(input.Value));
    }

    /// <summary>
    /// For any color in the predefined palette, ShiftColor.Create() succeeds.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.3</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidColorArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftColor_Create_WithValidPaletteColor_Succeeds(ValidColorInput input)
    {
        ShiftColor result = ShiftColor.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value.ToUpperInvariant()));
    }

    // ==================== ShiftTime — invalid inputs ====================

    /// <summary>
    /// For any hours value outside 0–23, ShiftTime.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.4</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(InvalidHoursArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftTime_Create_WithInvalidHours_ThrowsDomainException(InvalidHoursInput input)
    {
        Assert.Throws<DomainException>(() => ShiftTime.Create(input.Hours, input.Minutes));
    }

    /// <summary>
    /// For any minutes value outside 0–59, ShiftTime.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.4</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(InvalidMinutesArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftTime_Create_WithInvalidMinutes_ThrowsDomainException(InvalidMinutesInput input)
    {
        Assert.Throws<DomainException>(() => ShiftTime.Create(input.Hours, input.Minutes));
    }

    /// <summary>
    /// For any valid hours (0–23) and minutes (0–59), ShiftTime.Create() succeeds.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.4</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidTimeArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void ShiftTime_Create_WithValidHoursAndMinutes_Succeeds(ValidTimeInput input)
    {
        ShiftTime result = ShiftTime.Create(input.Hours, input.Minutes);

        Assert.Multiple(() =>
        {
            Assert.That(result.Hours, Is.EqualTo(input.Hours));
            Assert.That(result.Minutes, Is.EqualTo(input.Minutes));
        });
    }

    // ==================== HoursWorked — invalid inputs ====================

    /// <summary>
    /// For any totalMinutes less than 1, HoursWorked.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.5</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(TooLowMinutesArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void HoursWorked_Create_WithTotalMinutesLessThan1_ThrowsDomainException(TooLowMinutesInput input)
    {
        Assert.Throws<DomainException>(() => HoursWorked.Create(input.TotalMinutes));
    }

    /// <summary>
    /// For any totalMinutes greater than 1440, HoursWorked.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.5</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(TooHighMinutesArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void HoursWorked_Create_WithTotalMinutesGreaterThan1440_ThrowsDomainException(TooHighMinutesInput input)
    {
        Assert.Throws<DomainException>(() => HoursWorked.Create(input.TotalMinutes));
    }

    /// <summary>
    /// For any totalMinutes in range [1, 1440], HoursWorked.Create() succeeds.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.2, 7.5</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidHoursWorkedArbitrary)])]
    [Category("Property 2: Shift validation rejects invalid input")]
    public void HoursWorked_Create_WithValidTotalMinutes_Succeeds(ValidHoursWorkedInput input)
    {
        HoursWorked result = HoursWorked.Create(input.TotalMinutes);

        Assert.That(result.TotalMinutes, Is.EqualTo(input.TotalMinutes));
    }

    // ==================== Wrapper types for FsCheck generation ====================

    /// <summary>Wrapper for whitespace-only string inputs.</summary>
    /// <param name="Value">The whitespace-only string.</param>
    public record WhitespaceOnlyString(string Value);

    /// <summary>Wrapper for names exceeding 50 characters.</summary>
    /// <param name="Value">The too-long name string.</param>
    public record TooLongName(string Value);

    /// <summary>Wrapper for valid shift name inputs.</summary>
    /// <param name="Value">The valid name string.</param>
    public record ValidShiftNameInput(string Value);

    /// <summary>Wrapper for multiple text elements string inputs.</summary>
    /// <param name="Value">The multi-element string.</param>
    public record MultipleTextElementsString(string Value);

    /// <summary>Wrapper for valid emoji inputs.</summary>
    /// <param name="Value">The valid emoji string.</param>
    public record ValidEmojiInput(string Value);

    /// <summary>Wrapper for invalid color inputs.</summary>
    /// <param name="Value">The invalid color string.</param>
    public record InvalidColorInput(string Value);

    /// <summary>Wrapper for valid color inputs.</summary>
    /// <param name="Value">The valid palette color string.</param>
    public record ValidColorInput(string Value);

    /// <summary>Wrapper for invalid hours input.</summary>
    /// <param name="Hours">The invalid hours value.</param>
    /// <param name="Minutes">A valid minutes value.</param>
    public record InvalidHoursInput(int Hours, int Minutes);

    /// <summary>Wrapper for invalid minutes input.</summary>
    /// <param name="Hours">A valid hours value.</param>
    /// <param name="Minutes">The invalid minutes value.</param>
    public record InvalidMinutesInput(int Hours, int Minutes);

    /// <summary>Wrapper for valid time input.</summary>
    /// <param name="Hours">Valid hours (0–23).</param>
    /// <param name="Minutes">Valid minutes (0–59).</param>
    public record ValidTimeInput(int Hours, int Minutes);

    /// <summary>Wrapper for too-low minutes input.</summary>
    /// <param name="TotalMinutes">A value less than 1.</param>
    public record TooLowMinutesInput(int TotalMinutes);

    /// <summary>Wrapper for too-high minutes input.</summary>
    /// <param name="TotalMinutes">A value greater than 1440.</param>
    public record TooHighMinutesInput(int TotalMinutes);

    /// <summary>Wrapper for valid hours worked input.</summary>
    /// <param name="TotalMinutes">A value in [1, 1440].</param>
    public record ValidHoursWorkedInput(int TotalMinutes);

    // ==================== Arbitrary classes ====================

    /// <summary>Provides arbitrary for whitespace-only strings.</summary>
    public sealed class WhitespaceOnlyArbitrary
    {
        /// <summary>Generates whitespace-only strings.</summary>
        /// <returns>An arbitrary for <see cref="WhitespaceOnlyString"/>.</returns>
        public static Arbitrary<WhitespaceOnlyString> Generate()
        {
            Gen<char> whitespaceChar = Gen.Elements(' ', '\t', '\n', '\r');

            Gen<WhitespaceOnlyString> gen = Gen.OneOf(
                Gen.Constant(new WhitespaceOnlyString(string.Empty)),
                Gen.Choose(1, 20)
                    .SelectMany(length => whitespaceChar.ArrayOf(length))
                    .Select(chars => new WhitespaceOnlyString(new string(chars))));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for names exceeding 50 characters.</summary>
    public sealed class TooLongNameArbitrary
    {
        /// <summary>Generates names that exceed 50 characters after trimming.</summary>
        /// <returns>An arbitrary for <see cref="TooLongName"/>.</returns>
        public static Arbitrary<TooLongName> Generate()
        {
            Gen<char> alphanumericChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

            Gen<TooLongName> gen = Gen.Choose(51, 200)
                .SelectMany(length => alphanumericChar.ArrayOf(length))
                .Select(chars => new TooLongName(new string(chars)));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for valid shift names.</summary>
    public sealed class ValidShiftNameArbitrary
    {
        /// <summary>Generates valid shift names (1–50 chars, not whitespace-only).</summary>
        /// <returns>An arbitrary for <see cref="ValidShiftNameInput"/>.</returns>
        public static Arbitrary<ValidShiftNameInput> Generate()
        {
            Gen<char> alphanumericChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
                'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
                'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
                '8', '9', '-');

            Gen<char> nameCharWithSpace = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
                'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
                'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
                '8', '9', ' ', '-');

            Gen<ValidShiftNameInput> gen =
                from firstChar in alphanumericChar
                from remainingLength in Gen.Choose(0, 49)
                from remaining in nameCharWithSpace.ArrayOf(remainingLength)
                let value = firstChar + new string(remaining)
                where value.Trim().Length >= 1 && value.Trim().Length <= 50
                select new ValidShiftNameInput(value);

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for multi-element strings.</summary>
    public sealed class MultipleTextElementsArbitrary
    {
        /// <summary>Generates strings with multiple text elements.</summary>
        /// <returns>An arbitrary for <see cref="MultipleTextElementsString"/>.</returns>
        public static Arbitrary<MultipleTextElementsString> Generate()
        {
            Gen<string> emojiGen = Gen.Elements<string>(ValidEmojis);
            Gen<char> asciiChar = Gen.Elements('A', 'B', 'C', 'D', '1', '2', '3');

            Gen<MultipleTextElementsString> gen = Gen.OneOf(
                Gen.Choose(2, 5)
                    .SelectMany(count => emojiGen.ArrayOf(count))
                    .Select(emojis => new MultipleTextElementsString(string.Concat(emojis))),
                Gen.Choose(2, 10)
                    .SelectMany(length => asciiChar.ArrayOf(length))
                    .Select(chars => new MultipleTextElementsString(new string(chars))));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for valid emoji inputs.</summary>
    public sealed class ValidEmojiArbitrary
    {
        /// <summary>Generates valid single emojis.</summary>
        /// <returns>An arbitrary for <see cref="ValidEmojiInput"/>.</returns>
        public static Arbitrary<ValidEmojiInput> Generate()
        {
            Gen<ValidEmojiInput> gen = Gen.Elements<string>(ValidEmojis)
                .Select(e => new ValidEmojiInput(e));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for invalid color inputs.</summary>
    public sealed class InvalidColorArbitrary
    {
        /// <summary>Generates color strings not in the predefined palette.</summary>
        /// <returns>An arbitrary for <see cref="InvalidColorInput"/>.</returns>
        public static Arbitrary<InvalidColorInput> Generate()
        {
            Gen<char> hexChar = Gen.Elements(
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'A', 'B', 'C', 'D', 'E', 'F');

            Gen<InvalidColorInput> gen = Gen.OneOf(
                Gen.Constant(new InvalidColorInput("#000000")),
                Gen.Constant(new InvalidColorInput("#FFFFFF")),
                Gen.Constant(new InvalidColorInput("#123456")),
                Gen.Constant(new InvalidColorInput("#ABCDEF")),
                Gen.Constant(new InvalidColorInput("#999999")),
                Gen.Constant(new InvalidColorInput("#FF0000")),
                Gen.Constant(new InvalidColorInput("#00FF00")),
                Gen.Constant(new InvalidColorInput("#0000FF")),
                hexChar.ArrayOf(6)
                    .Select(chars => "#" + new string(chars))
                    .Where(c => !ShiftColor.Palette.Contains(c))
                    .Select(c => new InvalidColorInput(c)));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for valid palette colors.</summary>
    public sealed class ValidColorArbitrary
    {
        /// <summary>Generates valid palette colors.</summary>
        /// <returns>An arbitrary for <see cref="ValidColorInput"/>.</returns>
        public static Arbitrary<ValidColorInput> Generate()
        {
            Gen<ValidColorInput> gen = Gen.Elements(PaletteColors)
                .Select(c => new ValidColorInput(c));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for invalid hours inputs.</summary>
    public sealed class InvalidHoursArbitrary
    {
        /// <summary>Generates inputs with hours outside 0–23.</summary>
        /// <returns>An arbitrary for <see cref="InvalidHoursInput"/>.</returns>
        public static Arbitrary<InvalidHoursInput> Generate()
        {
            Gen<int> invalidHoursGen = Gen.OneOf(
                Gen.Choose(-100, -1),
                Gen.Choose(24, 200));

            Gen<InvalidHoursInput> gen =
                from hours in invalidHoursGen
                from minutes in Gen.Choose(0, 59)
                select new InvalidHoursInput(hours, minutes);

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for invalid minutes inputs.</summary>
    public sealed class InvalidMinutesArbitrary
    {
        /// <summary>Generates inputs with minutes outside 0–59.</summary>
        /// <returns>An arbitrary for <see cref="InvalidMinutesInput"/>.</returns>
        public static Arbitrary<InvalidMinutesInput> Generate()
        {
            Gen<int> invalidMinutesGen = Gen.OneOf(
                Gen.Choose(-100, -1),
                Gen.Choose(60, 200));

            Gen<InvalidMinutesInput> gen =
                from hours in Gen.Choose(0, 23)
                from minutes in invalidMinutesGen
                select new InvalidMinutesInput(hours, minutes);

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for valid time inputs.</summary>
    public sealed class ValidTimeArbitrary
    {
        /// <summary>Generates valid hours and minutes.</summary>
        /// <returns>An arbitrary for <see cref="ValidTimeInput"/>.</returns>
        public static Arbitrary<ValidTimeInput> Generate()
        {
            Gen<ValidTimeInput> gen =
                from hours in Gen.Choose(0, 23)
                from minutes in Gen.Choose(0, 59)
                select new ValidTimeInput(hours, minutes);

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for too-low minutes inputs.</summary>
    public sealed class TooLowMinutesArbitrary
    {
        /// <summary>Generates totalMinutes values less than 1.</summary>
        /// <returns>An arbitrary for <see cref="TooLowMinutesInput"/>.</returns>
        public static Arbitrary<TooLowMinutesInput> Generate()
        {
            Gen<TooLowMinutesInput> gen = Gen.Choose(-1000, 0)
                .Select(m => new TooLowMinutesInput(m));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for too-high minutes inputs.</summary>
    public sealed class TooHighMinutesArbitrary
    {
        /// <summary>Generates totalMinutes values greater than 1440.</summary>
        /// <returns>An arbitrary for <see cref="TooHighMinutesInput"/>.</returns>
        public static Arbitrary<TooHighMinutesInput> Generate()
        {
            Gen<TooHighMinutesInput> gen = Gen.Choose(1441, 10000)
                .Select(m => new TooHighMinutesInput(m));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for valid hours worked inputs.</summary>
    public sealed class ValidHoursWorkedArbitrary
    {
        /// <summary>Generates valid totalMinutes values in [1, 1440].</summary>
        /// <returns>An arbitrary for <see cref="ValidHoursWorkedInput"/>.</returns>
        public static Arbitrary<ValidHoursWorkedInput> Generate()
        {
            Gen<ValidHoursWorkedInput> gen = Gen.Choose(1, 1440)
                .Select(m => new ValidHoursWorkedInput(m));

            return gen.ToArbitrary();
        }
    }
}
