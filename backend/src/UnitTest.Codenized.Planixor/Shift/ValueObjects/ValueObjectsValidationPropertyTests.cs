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
    internal static readonly string[] PaletteColors =
    [
        "#EF4444", "#F97316", "#F59E0B", "#10B981", "#0B86D4",
        "#2563EB", "#7C3AED", "#EC4899", "#6B7280", "#1F2937",
    ];

    internal static readonly string[] ValidEmojis =
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
}
