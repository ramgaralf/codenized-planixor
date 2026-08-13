// <copyright file="ValidHoursWorkedArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid hours worked inputs.</summary>
public sealed class ValidHoursWorkedArbitrary
{
    /// <summary>Generates valid totalMinutes values in [1, 1440].</summary>
    /// <returns>An arbitrary for <see cref="ValidHoursWorkedInput"/>.</returns>
    public static Arbitrary<ValidHoursWorkedInput> Generate()
    {
        Gen<ValidHoursWorkedInput> gen = Gen.Choose(1, 1440)
            .Select(m => new ValidHoursWorkedInput(m));

        return gen.ToArbitrary();
    }
}
