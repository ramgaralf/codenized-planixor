// <copyright file="ShiftModeSettingArbitraries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Domain;

using global::Codenized.Planixor.Core.Entities;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Provides FsCheck arbitrary generators for ShiftModeSetting inputs.
/// </summary>
public sealed class ShiftModeSettingArbitraries
{
    /// <summary>Generates arbitrary valid shift mode setting creation inputs.</summary>
    /// <returns>An arbitrary for <see cref="ShiftModeSettingCreateInput"/>.</returns>
    public static Arbitrary<ShiftModeSettingCreateInput> Generate()
    {
        Gen<char> alphanumChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9');

        Gen<ShiftModeSettingCreateInput> gen =
            from userIdLength in Gen.Choose(1, 50)
            from userIdChars in alphanumChar.ArrayOf(userIdLength)
            select new ShiftModeSettingCreateInput(
                Guid.NewGuid(),
                new string(userIdChars));

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary valid sync input parameters.</summary>
    /// <returns>An arbitrary for <see cref="ShiftModeSettingSyncInput"/>.</returns>
    public static Arbitrary<ShiftModeSettingSyncInput> Generate2()
    {
        Gen<ShiftModeSettingSyncInput> gen =
            from enabled in Gen.Elements(true, false)
            from year in Gen.Choose(2020, 2030)
            from month in Gen.Choose(1, 12)
            from day in Gen.Choose(1, 28)
            from hour in Gen.Choose(0, 23)
            from minute in Gen.Choose(0, 59)
            from second in Gen.Choose(0, 59)
            from isDeleted in Gen.Elements(true, false)
            select new ShiftModeSettingSyncInput(
                enabled,
                new DateTime(year, month, day, hour, minute, second, DateTimeKind.Utc),
                isDeleted);

        return gen.ToArbitrary();
    }
}
