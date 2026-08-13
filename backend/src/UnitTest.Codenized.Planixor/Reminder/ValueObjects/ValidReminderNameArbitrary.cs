// <copyright file="ValidReminderNameArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

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
