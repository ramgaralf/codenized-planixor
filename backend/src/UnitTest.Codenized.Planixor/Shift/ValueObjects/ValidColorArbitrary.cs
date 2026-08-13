// <copyright file="ValidColorArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid palette colors.</summary>
public sealed class ValidColorArbitrary
{
    /// <summary>Generates valid palette colors.</summary>
    /// <returns>An arbitrary for <see cref="ValidColorInput"/>.</returns>
    public static Arbitrary<ValidColorInput> Generate()
    {
        Gen<ValidColorInput> gen = Gen.Elements(ValueObjectsValidationPropertyTests.PaletteColors)
            .Select(c => new ValidColorInput(c));

        return gen.ToArbitrary();
    }
}
