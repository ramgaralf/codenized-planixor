// <copyright file="ValidTotalMinutesArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid total minutes values (0–1439).</summary>
public sealed class ValidTotalMinutesArbitrary
{
    /// <summary>Generates valid total minutes.</summary>
    /// <returns>An arbitrary for <see cref="ValidTotalMinutesInput"/>.</returns>
    public static Arbitrary<ValidTotalMinutesInput> Generate()
    {
        Gen<ValidTotalMinutesInput> gen = Gen.Choose(0, 1439)
            .Select(m => new ValidTotalMinutesInput(m));

        return gen.ToArbitrary();
    }
}
