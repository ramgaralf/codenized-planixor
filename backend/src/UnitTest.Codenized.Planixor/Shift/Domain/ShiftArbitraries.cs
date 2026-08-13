// <copyright file="ShiftArbitraries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Provides FsCheck arbitrary generators for valid Shift inputs.
/// </summary>
public sealed class ShiftArbitraries
{
    /// <summary>Generates arbitrary valid shift creation inputs.</summary>
    /// <returns>An arbitrary for <see cref="ShiftCreateInput"/>.</returns>
    public static Arbitrary<ShiftCreateInput> Generate()
    {
        Gen<char> alphanumChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9');

        Gen<char> anyNameChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9', ' ', '-');

        Gen<ShiftCreateInput> gen =
            from firstChar in alphanumChar
            from remainingLength in Gen.Choose(0, 49)
            from remainingChars in anyNameChar.ArrayOf(remainingLength)
            from emojiIndex in Gen.Choose(0, ShiftPropertyTests.ValidEmojis.Length - 1)
            from colorIndex in Gen.Choose(0, ShiftPropertyTests.PaletteColors.Length - 1)
            from startHours in Gen.Choose(0, 23)
            from startMinutes in Gen.Choose(0, 59)
            from endHours in Gen.Choose(0, 23)
            from endMinutes in Gen.Choose(0, 59)
            from hoursWorkedMinutes in Gen.Choose(1, 1440)
            select new ShiftCreateInput(
                Guid.NewGuid(),
                Guid.NewGuid().ToString(),
                ShiftName.Create(firstChar + new string(remainingChars)),
                ShiftIcon.Create(ShiftPropertyTests.ValidEmojis[emojiIndex]),
                ShiftColor.Create(ShiftPropertyTests.PaletteColors[colorIndex]),
                ShiftTime.Create(startHours, startMinutes),
                ShiftTime.Create(endHours, endMinutes),
                HoursWorked.Create(hoursWorkedMinutes),
                DateTime.UtcNow);

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary valid shift update inputs.</summary>
    /// <returns>An arbitrary for <see cref="ShiftUpdateInput"/>.</returns>
    public static Arbitrary<ShiftUpdateInput> Generate2()
    {
        Gen<char> alphanumChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9');

        Gen<char> anyNameChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9', ' ', '-');

        Gen<ShiftUpdateInput> gen =
            from firstChar in alphanumChar
            from remainingLength in Gen.Choose(0, 49)
            from remainingChars in anyNameChar.ArrayOf(remainingLength)
            from emojiIndex in Gen.Choose(0, ShiftPropertyTests.ValidEmojis.Length - 1)
            from colorIndex in Gen.Choose(0, ShiftPropertyTests.PaletteColors.Length - 1)
            from startHours in Gen.Choose(0, 23)
            from startMinutes in Gen.Choose(0, 59)
            from endHours in Gen.Choose(0, 23)
            from endMinutes in Gen.Choose(0, 59)
            from hoursWorkedMinutes in Gen.Choose(1, 1440)
            select new ShiftUpdateInput(
                ShiftName.Create(firstChar + new string(remainingChars)),
                ShiftIcon.Create(ShiftPropertyTests.ValidEmojis[emojiIndex]),
                ShiftColor.Create(ShiftPropertyTests.PaletteColors[colorIndex]),
                ShiftTime.Create(startHours, startMinutes),
                ShiftTime.Create(endHours, endMinutes),
                HoursWorked.Create(hoursWorkedMinutes));

        return gen.ToArbitrary();
    }
}
