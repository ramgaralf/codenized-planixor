// <copyright file="InvalidCreateRangeArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for invalid total minutes (outside [0, 1440]).</summary>
public sealed class InvalidCreateRangeArbitrary
{
    /// <summary>Generates total minutes values outside [1, 1440]: zero, negative, or above a full day.</summary>
    /// <returns>An arbitrary for <see cref="InvalidCreateRangeInput"/>.</returns>
    public static Arbitrary<InvalidCreateRangeInput> Generate()
    {
        Gen<InvalidCreateRangeInput> gen = Gen.OneOf(
            Gen.Choose(-10000, 0).Select(m => new InvalidCreateRangeInput(m)),
            Gen.Choose(1441, 10000).Select(m => new InvalidCreateRangeInput(m)));

        return gen.ToArbitrary();
    }
}
