// <copyright file="ValidNameWithWhitespaceArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid names surrounded by whitespace.</summary>
public sealed class ValidNameWithWhitespaceArbitrary
{
    /// <summary>Generates valid names with leading and trailing whitespace added.</summary>
    /// <returns>An arbitrary for <see cref="ValidNameWithWhitespaceInput"/>.</returns>
    public static Arbitrary<ValidNameWithWhitespaceInput> Generate()
    {
        Gen<char> contentChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

        Gen<ValidNameWithWhitespaceInput> gen =
            from length in Gen.Choose(1, 48)
            from chars in contentChar.ArrayOf(length)
            from leadingSpaces in Gen.Choose(1, 5)
            from trailingSpaces in Gen.Choose(1, 5)
            let content = new string(chars)
            let padded = new string(' ', leadingSpaces) + content + new string(' ', trailingSpaces)
            select new ValidNameWithWhitespaceInput(padded);

        return gen.ToArbitrary();
    }
}
