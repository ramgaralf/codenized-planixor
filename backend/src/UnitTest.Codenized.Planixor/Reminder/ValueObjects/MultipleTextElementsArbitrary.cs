// <copyright file="MultipleTextElementsArbitrary.cs" company="Codenized">
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

/// <summary>Provides arbitrary for strings with multiple text elements (non-emoji characters).</summary>
public sealed class MultipleTextElementsArbitrary
{
    /// <summary>Generates strings with multiple ASCII characters (each is one text element).</summary>
    /// <returns>An arbitrary for <see cref="MultipleTextElementsInput"/>.</returns>
    public static Arbitrary<MultipleTextElementsInput> Generate()
    {
        Gen<char> asciiChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

        Gen<MultipleTextElementsInput> gen = Gen.Choose(2, 10)
            .SelectMany(length => asciiChar.ArrayOf(length))
            .Select(chars => new MultipleTextElementsInput(new string(chars)));

        return gen.ToArbitrary();
    }
}
