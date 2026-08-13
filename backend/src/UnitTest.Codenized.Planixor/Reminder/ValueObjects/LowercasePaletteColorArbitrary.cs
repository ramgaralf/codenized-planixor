// <copyright file="LowercasePaletteColorArbitrary.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Provides arbitrary for lowercase palette colors.</summary>
public sealed class LowercasePaletteColorArbitrary
{
    /// <summary>Generates lowercase versions of palette colors.</summary>
    /// <returns>An arbitrary for <see cref="LowercasePaletteColorInput"/>.</returns>
    public static Arbitrary<LowercasePaletteColorInput> Generate()
    {
        Gen<LowercasePaletteColorInput> gen = Gen.Elements(ReminderColorPropertyTests.AllPaletteColors)
            .Select(c => new LowercasePaletteColorInput(c.ToLowerInvariant()));

        return gen.ToArbitrary();
    }
}
