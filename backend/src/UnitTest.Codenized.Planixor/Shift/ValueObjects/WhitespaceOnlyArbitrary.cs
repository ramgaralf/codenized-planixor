// <copyright file="WhitespaceOnlyArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for whitespace-only strings.</summary>
public sealed class WhitespaceOnlyArbitrary
{
    /// <summary>Generates whitespace-only strings.</summary>
    /// <returns>An arbitrary for <see cref="WhitespaceOnlyString"/>.</returns>
    public static Arbitrary<WhitespaceOnlyString> Generate()
    {
        Gen<char> whitespaceChar = Gen.Elements(' ', '\t', '\n', '\r');

        Gen<WhitespaceOnlyString> gen = Gen.OneOf(
            Gen.Constant(new WhitespaceOnlyString(string.Empty)),
            Gen.Choose(1, 20)
                .SelectMany(length => whitespaceChar.ArrayOf(length))
                .Select(chars => new WhitespaceOnlyString(new string(chars))));

        return gen.ToArbitrary();
    }
}
