// <copyright file="ValidSingleEmojiArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;
using System.Globalization;

/// <summary>Provides arbitrary for valid single emoji inputs.</summary>
public sealed class ValidSingleEmojiArbitrary
{
    /// <summary>Generates valid single emoji strings (exactly one text element).</summary>
    /// <returns>An arbitrary for <see cref="ValidSingleEmojiInput"/>.</returns>
    public static Arbitrary<ValidSingleEmojiInput> Generate()
    {
        Gen<ValidSingleEmojiInput> gen = Gen.Elements<string>(ReminderIconPropertyTests.SingleEmojis)
            .Select(e => new ValidSingleEmojiInput(e));

        return gen.ToArbitrary();
    }
}
