// <copyright file="ValidTimeArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid time inputs.</summary>
public sealed class ValidTimeArbitrary
{
    /// <summary>Generates valid hours and minutes.</summary>
    /// <returns>An arbitrary for <see cref="ValidTimeInput"/>.</returns>
    public static Arbitrary<ValidTimeInput> Generate()
    {
        Gen<ValidTimeInput> gen =
            from hours in Gen.Choose(0, 23)
            from minutes in Gen.Choose(0, 59)
            select new ValidTimeInput(hours, minutes);

        return gen.ToArbitrary();
    }
}
