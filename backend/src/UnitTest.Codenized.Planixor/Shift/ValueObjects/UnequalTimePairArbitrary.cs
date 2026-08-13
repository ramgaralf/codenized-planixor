// <copyright file="UnequalTimePairArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for unequal time pairs (0–1439, start != end).</summary>
public sealed class UnequalTimePairArbitrary
{
    /// <summary>Generates unequal time pairs.</summary>
    /// <returns>An arbitrary for <see cref="UnequalTimePairInput"/>.</returns>
    public static Arbitrary<UnequalTimePairInput> Generate()
    {
        Gen<UnequalTimePairInput> gen =
            from start in Gen.Choose(0, 1439)
            from end in Gen.Choose(0, 1439)
            where start != end
            select new UnequalTimePairInput(start, end);

        return gen.ToArbitrary();
    }
}
