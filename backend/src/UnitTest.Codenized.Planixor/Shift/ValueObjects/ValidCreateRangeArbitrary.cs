// <copyright file="ValidCreateRangeArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid total minutes in [0, 1440].</summary>
public sealed class ValidCreateRangeArbitrary
{
    /// <summary>Generates total minutes values in [1, 1440], the representable range.</summary>
    /// <returns>An arbitrary for <see cref="ValidCreateRangeInput"/>.</returns>
    public static Arbitrary<ValidCreateRangeInput> Generate()
    {
        Gen<ValidCreateRangeInput> gen = Gen.Choose(1, 1440)
            .Select(m => new ValidCreateRangeInput(m));

        return gen.ToArbitrary();
    }
}
