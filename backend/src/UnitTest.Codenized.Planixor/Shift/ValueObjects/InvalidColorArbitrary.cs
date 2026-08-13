// <copyright file="InvalidColorArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

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
