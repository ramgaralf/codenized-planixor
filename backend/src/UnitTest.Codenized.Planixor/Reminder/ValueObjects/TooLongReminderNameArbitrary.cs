// <copyright file="TooLongReminderNameArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

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
