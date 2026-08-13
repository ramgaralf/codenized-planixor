// <copyright file="TooHighMinutesArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for too-high minutes inputs.</summary>
public sealed class TooHighMinutesArbitrary
{
    /// <summary>Generates totalMinutes values greater than 1440.</summary>
    /// <returns>An arbitrary for <see cref="TooHighMinutesInput"/>.</returns>
    public static Arbitrary<TooHighMinutesInput> Generate()
    {
        Gen<TooHighMinutesInput> gen = Gen.Choose(1441, 10000)
            .Select(m => new TooHighMinutesInput(m));

        return gen.ToArbitrary();
    }
}
