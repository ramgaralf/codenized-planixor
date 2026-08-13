// <copyright file="NonPaletteColorArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

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
