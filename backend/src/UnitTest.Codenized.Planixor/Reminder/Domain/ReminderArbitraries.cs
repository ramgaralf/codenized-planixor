// <copyright file="ReminderArbitraries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Provides FsCheck arbitrary generators for valid Reminder inputs.
/// </summary>
public sealed class ReminderArbitraries
{
    /// <summary>Generates arbitrary valid reminder creation inputs.</summary>
    /// <returns>An arbitrary for <see cref="ReminderCreateInput"/>.</returns>
    public static Arbitrary<ReminderCreateInput> Generate()
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

        Gen<ReminderCreateInput> gen =
            from firstChar in alphanumChar
            from remainingLength in Gen.Choose(0, 49)
            from remainingChars in anyNameChar.ArrayOf(remainingLength)
            from emojiIndex in Gen.Choose(0, ReminderPropertyTests.ValidEmojis.Length - 1)
            from colorIndex in Gen.Choose(0, ReminderPropertyTests.PaletteColors.Length - 1)
            select new ReminderCreateInput(
                Guid.NewGuid(),
                Guid.NewGuid().ToString(),
                ReminderName.Create(firstChar + new string(remainingChars)),
                ReminderIcon.Create(ReminderPropertyTests.ValidEmojis[emojiIndex]),
                ReminderColor.Create(ReminderPropertyTests.PaletteColors[colorIndex]),
                DateTime.UtcNow);

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary valid reminder update inputs.</summary>
    /// <returns>An arbitrary for <see cref="ReminderUpdateInput"/>.</returns>
    public static Arbitrary<ReminderUpdateInput> Generate2()
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

        Gen<ReminderUpdateInput> gen =
            from firstChar in alphanumChar
            from remainingLength in Gen.Choose(0, 49)
            from remainingChars in anyNameChar.ArrayOf(remainingLength)
            from emojiIndex in Gen.Choose(0, ReminderPropertyTests.ValidEmojis.Length - 1)
            from colorIndex in Gen.Choose(0, ReminderPropertyTests.PaletteColors.Length - 1)
            select new ReminderUpdateInput(
                ReminderName.Create(firstChar + new string(remainingChars)),
                ReminderIcon.Create(ReminderPropertyTests.ValidEmojis[emojiIndex]),
                ReminderColor.Create(ReminderPropertyTests.PaletteColors[colorIndex]));

        return gen.ToArbitrary();
    }
}
