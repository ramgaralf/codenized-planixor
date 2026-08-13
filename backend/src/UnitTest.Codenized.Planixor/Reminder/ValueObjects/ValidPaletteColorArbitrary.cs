// <copyright file="ValidPaletteColorArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for valid palette colors.</summary>
public sealed class ValidPaletteColorArbitrary
{
    /// <summary>Generates valid colors from the Predefined_Palette.</summary>
    /// <returns>An arbitrary for <see cref="ValidPaletteColorInput"/>.</returns>
    public static Arbitrary<ValidPaletteColorInput> Generate()
    {
        Gen<ValidPaletteColorInput> gen = Gen.Elements(ReminderColorPropertyTests.AllPaletteColors)
            .Select(c => new ValidPaletteColorInput(c));

        return gen.ToArbitrary();
    }
}
