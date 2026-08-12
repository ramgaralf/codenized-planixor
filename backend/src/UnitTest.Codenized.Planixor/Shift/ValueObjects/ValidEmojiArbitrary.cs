// <copyright file="ValidEmojiArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid emoji inputs.</summary>
public sealed class ValidEmojiArbitrary
{
    /// <summary>Generates valid single emojis.</summary>
    /// <returns>An arbitrary for <see cref="ValidEmojiInput"/>.</returns>
    public static Arbitrary<ValidEmojiInput> Generate()
    {
        Gen<ValidEmojiInput> gen = Gen.Elements<string>(ValueObjectsValidationPropertyTests.ValidEmojis)
            .Select(e => new ValidEmojiInput(e));

        return gen.ToArbitrary();
    }
}
