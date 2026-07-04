// <copyright file="ReminderColorPropertyTests.cs" company="Codenized">
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
/// Property-based tests for ReminderColor value object — Property 16: Color validation accepts only Predefined_Palette members.
/// Feature: gh5-reminder-management, Property 16: Color validation accepts only Predefined_Palette members.
/// </summary>
/// <remarks>
/// <strong>Validates: Requirements 7.3</strong>
/// </remarks>
[TestFixture]
[Category("Feature: gh5-reminder-management, Property 16: Color validation accepts only Predefined_Palette members")]
public sealed class ReminderColorPropertyTests
{
    private static readonly string[] AllPaletteColors =
    [
        "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",

        // Orange
        "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",

        // Amber
        "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",

        // Green
        "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",

        // Teal
        "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",

        // Blue
        "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",

        // Purple
        "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",

        // Pink
        "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",

        // Gray
        "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
    ];

    /// <summary>
    /// For any color in the Predefined_Palette, ReminderColor.Create() succeeds and stores the value in uppercase.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.3</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(ValidPaletteColorArbitrary)])]
    [Category("Property 16: Color validation accepts only Predefined_Palette members")]
    public void Create_WithPaletteColor_Succeeds(ValidPaletteColorInput input)
    {
        ReminderColor result = ReminderColor.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value.ToUpperInvariant()));
    }

    /// <summary>
    /// For any color in the Predefined_Palette provided in lowercase, ReminderColor.Create() succeeds (case-insensitive).
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.3</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(LowercasePaletteColorArbitrary)])]
    [Category("Property 16: Color validation accepts only Predefined_Palette members")]
    public void Create_WithLowercasePaletteColor_SucceedsCaseInsensitive(LowercasePaletteColorInput input)
    {
        ReminderColor result = ReminderColor.Create(input.Value);

        Assert.That(result.Value, Is.EqualTo(input.Value.ToUpperInvariant()));
    }

    /// <summary>
    /// For any hex color string that is NOT in the Predefined_Palette, ReminderColor.Create() throws DomainException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 7.3</strong>
    /// </remarks>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = [typeof(NonPaletteColorArbitrary)])]
    [Category("Property 16: Color validation accepts only Predefined_Palette members")]
    public void Create_WithNonPaletteColor_ThrowsDomainException(NonPaletteColorInput input)
    {
        Assert.Throws<DomainException>(() => ReminderColor.Create(input.Value));
    }

    // ==================== Wrapper types for FsCheck generation ====================

    /// <summary>Wrapper for valid palette color inputs.</summary>
    /// <param name="Value">A color from the Predefined_Palette.</param>
    public record ValidPaletteColorInput(string Value);

    /// <summary>Wrapper for lowercase palette color inputs.</summary>
    /// <param name="Value">A lowercase color from the Predefined_Palette.</param>
    public record LowercasePaletteColorInput(string Value);

    /// <summary>Wrapper for non-palette color inputs.</summary>
    /// <param name="Value">A hex color string not in the Predefined_Palette.</param>
    public record NonPaletteColorInput(string Value);

    // ==================== Arbitrary classes ====================

    /// <summary>Provides arbitrary for valid palette colors.</summary>
    public sealed class ValidPaletteColorArbitrary
    {
        /// <summary>Generates valid colors from the Predefined_Palette.</summary>
        /// <returns>An arbitrary for <see cref="ValidPaletteColorInput"/>.</returns>
        public static Arbitrary<ValidPaletteColorInput> Generate()
        {
            Gen<ValidPaletteColorInput> gen = Gen.Elements(AllPaletteColors)
                .Select(c => new ValidPaletteColorInput(c));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for lowercase palette colors.</summary>
    public sealed class LowercasePaletteColorArbitrary
    {
        /// <summary>Generates lowercase versions of palette colors.</summary>
        /// <returns>An arbitrary for <see cref="LowercasePaletteColorInput"/>.</returns>
        public static Arbitrary<LowercasePaletteColorInput> Generate()
        {
            Gen<LowercasePaletteColorInput> gen = Gen.Elements(AllPaletteColors)
                .Select(c => new LowercasePaletteColorInput(c.ToLowerInvariant()));

            return gen.ToArbitrary();
        }
    }

    /// <summary>Provides arbitrary for non-palette hex color strings.</summary>
    public sealed class NonPaletteColorArbitrary
    {
        /// <summary>Generates hex color strings that are NOT in the Predefined_Palette.</summary>
        /// <returns>An arbitrary for <see cref="NonPaletteColorInput"/>.</returns>
        public static Arbitrary<NonPaletteColorInput> Generate()
        {
            Gen<char> hexChar = Gen.Elements(
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'A', 'B', 'C', 'D', 'E', 'F');

            Gen<NonPaletteColorInput> gen = Gen.OneOf(
                Gen.Constant(new NonPaletteColorInput("#000000")),
                Gen.Constant(new NonPaletteColorInput("#FFFFFF")),
                Gen.Constant(new NonPaletteColorInput("#123456")),
                Gen.Constant(new NonPaletteColorInput("#ABCDEF")),
                Gen.Constant(new NonPaletteColorInput("#FF0000")),
                Gen.Constant(new NonPaletteColorInput("#00FF00")),
                Gen.Constant(new NonPaletteColorInput("#0000FF")),
                Gen.Constant(new NonPaletteColorInput("#AABBCC")),
                hexChar.ArrayOf(6)
                    .Select(chars => "#" + new string(chars))
                    .Where(c => !ReminderColor.Palette.Contains(c))
                    .Select(c => new NonPaletteColorInput(c)));

            return gen.ToArbitrary();
        }
    }
}
