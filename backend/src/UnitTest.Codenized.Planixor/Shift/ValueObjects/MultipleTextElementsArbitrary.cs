// <copyright file="MultipleTextElementsArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for multi-element strings.</summary>
public sealed class MultipleTextElementsArbitrary
{
    /// <summary>Generates strings with multiple text elements.</summary>
    /// <returns>An arbitrary for <see cref="MultipleTextElementsString"/>.</returns>
    public static Arbitrary<MultipleTextElementsString> Generate()
    {
        Gen<string> emojiGen = Gen.Elements<string>(ValueObjectsValidationPropertyTests.ValidEmojis);
        Gen<char> asciiChar = Gen.Elements('A', 'B', 'C', 'D', '1', '2', '3');

        Gen<MultipleTextElementsString> gen = Gen.OneOf(
            Gen.Choose(2, 5)
                .SelectMany(count => emojiGen.ArrayOf(count))
                .Select(emojis => new MultipleTextElementsString(string.Concat(emojis))),
            Gen.Choose(2, 10)
                .SelectMany(length => asciiChar.ArrayOf(length))
                .Select(chars => new MultipleTextElementsString(new string(chars))));

        return gen.ToArbitrary();
    }
}
