// <copyright file="TooLowMinutesArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for too-low minutes inputs.</summary>
public sealed class TooLowMinutesArbitrary
{
    /// <summary>Generates totalMinutes values below the shortest representable shift.</summary>
    /// <returns>An arbitrary for <see cref="TooLowMinutesInput"/>.</returns>
    /// <remarks>
    /// The range includes <c>0</c> on purpose: a shift of no duration is not representable, so it must be
    /// rejected like any negative value. This property used to fail roughly one run in ten — whenever a zero was
    /// drawn among its hundred samples — because <c>HoursWorked.Create</c> accepted it. The rule now matches.
    /// </remarks>
    public static Arbitrary<TooLowMinutesInput> Generate()
    {
        Gen<TooLowMinutesInput> gen = Gen.Choose(-1000, 0)
            .Select(m => new TooLowMinutesInput(m));

        return gen.ToArbitrary();
    }
}
