// <copyright file="InvalidMinutesArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for invalid minutes inputs.</summary>
public sealed class InvalidMinutesArbitrary
{
    /// <summary>Generates inputs with minutes outside 0–59.</summary>
    /// <returns>An arbitrary for <see cref="InvalidMinutesInput"/>.</returns>
    public static Arbitrary<InvalidMinutesInput> Generate()
    {
        Gen<int> invalidMinutesGen = Gen.OneOf(
            Gen.Choose(-100, -1),
            Gen.Choose(60, 200));

        Gen<InvalidMinutesInput> gen =
            from hours in Gen.Choose(0, 23)
            from minutes in invalidMinutesGen
            select new InvalidMinutesInput(hours, minutes);

        return gen.ToArbitrary();
    }
}
