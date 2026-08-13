// <copyright file="MultipleEmojisArbitrary.cs" company="Codenized">
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

/// <summary>Provides arbitrary for strings with multiple emojis concatenated.</summary>
public sealed class MultipleEmojisArbitrary
{
    /// <summary>Generates strings with 2–5 emojis concatenated together.</summary>
    /// <returns>An arbitrary for <see cref="MultipleEmojisInput"/>.</returns>
    public static Arbitrary<MultipleEmojisInput> Generate()
    {
        Gen<string> emojiGen = Gen.Elements<string>(ReminderIconPropertyTests.SingleEmojis);

        Gen<MultipleEmojisInput> gen = Gen.Choose(2, 5)
            .SelectMany(count => emojiGen.ArrayOf(count))
            .Select(emojis => new MultipleEmojisInput(string.Concat(emojis)));

        return gen.ToArbitrary();
    }
}
