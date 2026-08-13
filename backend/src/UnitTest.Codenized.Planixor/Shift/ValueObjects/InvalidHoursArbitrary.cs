// <copyright file="InvalidHoursArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for invalid hours inputs.</summary>
public sealed class InvalidHoursArbitrary
{
    /// <summary>Generates inputs with hours outside 0–23.</summary>
    /// <returns>An arbitrary for <see cref="InvalidHoursInput"/>.</returns>
    public static Arbitrary<InvalidHoursInput> Generate()
    {
        Gen<int> invalidHoursGen = Gen.OneOf(
            Gen.Choose(-100, -1),
            Gen.Choose(24, 200));

        Gen<InvalidHoursInput> gen =
            from hours in invalidHoursGen
            from minutes in Gen.Choose(0, 59)
            select new InvalidHoursInput(hours, minutes);

        return gen.ToArbitrary();
    }
}
