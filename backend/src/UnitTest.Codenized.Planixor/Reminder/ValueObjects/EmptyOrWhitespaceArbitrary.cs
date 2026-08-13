// <copyright file="EmptyOrWhitespaceArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for empty or whitespace-only strings.</summary>
public sealed class EmptyOrWhitespaceArbitrary
{
    /// <summary>Generates empty strings or strings containing only whitespace characters.</summary>
    /// <returns>An arbitrary for <see cref="EmptyOrWhitespaceInput"/>.</returns>
    public static Arbitrary<EmptyOrWhitespaceInput> Generate()
    {
        Gen<char> whitespaceChar = Gen.Elements(' ', '\t', '\n', '\r');

        Gen<EmptyOrWhitespaceInput> gen = Gen.OneOf(
            Gen.Constant(new EmptyOrWhitespaceInput(string.Empty)),
            Gen.Choose(1, 20)
                .SelectMany(length => whitespaceChar.ArrayOf(length))
                .Select(chars => new EmptyOrWhitespaceInput(new string(chars))));

        return gen.ToArbitrary();
    }
}
