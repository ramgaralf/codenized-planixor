// <copyright file="AnyTimePairArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for any time pair (0–1439).</summary>
public sealed class AnyTimePairArbitrary
{
    /// <summary>Generates any valid time pair.</summary>
    /// <returns>An arbitrary for <see cref="AnyTimePairInput"/>.</returns>
    public static Arbitrary<AnyTimePairInput> Generate()
    {
        Gen<AnyTimePairInput> gen =
            from start in Gen.Choose(0, 1439)
            from end in Gen.Choose(0, 1439)
            select new AnyTimePairInput(start, end);

        return gen.ToArbitrary();
    }
}
