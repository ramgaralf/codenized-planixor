// <copyright file="SyncArbitraries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Sync;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Provides FsCheck arbitrary generators for sync-related test inputs.
/// </summary>
public sealed class SyncArbitraries
{
    /// <summary>Generates arbitrary sync state inputs for push filter tests.</summary>
    /// <returns>An arbitrary for arrays of <see cref="ShiftSyncStateInput"/>.</returns>
    public static Arbitrary<ShiftSyncStateInput[]> GenerateShiftSyncStateInputArray()
    {
        Gen<ShiftSyncStateInput> singleGen =
            from syncState in Gen.Choose(0, 2)
            from dayOffset in Gen.Choose(1, 365)
            from hourOffset in Gen.Choose(0, 23)
            select CreateSyncStateInput(syncState, dayOffset, hourOffset);

        Gen<ShiftSyncStateInput[]> gen =
            from count in Gen.Choose(1, 20)
            from items in singleGen.ArrayOf(count)
            select items;

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary conflict resolution inputs.</summary>
    /// <returns>An arbitrary for <see cref="ConflictResolutionInput"/>.</returns>
    public static Arbitrary<ConflictResolutionInput> GenerateConflictResolutionInput()
    {
        DateTime baseDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        Gen<ConflictResolutionInput> gen =
            from scenario in Gen.Choose(0, 2)
            from localDayOffset in Gen.Choose(0, 365)
            from localHourOffset in Gen.Choose(0, 23)
            from remoteDayOffset in Gen.Choose(0, 365)
            from remoteHourOffset in Gen.Choose(0, 23)
            select scenario switch
            {
                0 => new ConflictResolutionInput(
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset),
                    baseDate.AddDays(remoteDayOffset).AddHours(remoteHourOffset + 24)),
                1 => new ConflictResolutionInput(
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset + 24),
                    baseDate.AddDays(remoteDayOffset).AddHours(remoteHourOffset)),
                _ => new ConflictResolutionInput(
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset),
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset)),
            };

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary valid shift inputs for pull merge tests.</summary>
    /// <returns>An arbitrary for <see cref="ShiftSyncCreateInput"/>.</returns>
    public static Arbitrary<ShiftSyncCreateInput> GenerateShiftSyncCreateInput()
    {
        Gen<char> alphanumChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9');

        Gen<char> anyNameChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9', ' ', '-');

        Gen<ShiftSyncCreateInput> gen =
            from firstChar in alphanumChar
            from remainingLength in Gen.Choose(0, 49)
            from remainingChars in anyNameChar.ArrayOf(remainingLength)
            from emojiIndex in Gen.Choose(0, ShiftSyncPropertyTests.ValidEmojis.Length - 1)
            from colorIndex in Gen.Choose(0, ShiftSyncPropertyTests.PaletteColors.Length - 1)
            from startHours in Gen.Choose(0, 23)
            from startMinutes in Gen.Choose(0, 59)
            from endHours in Gen.Choose(0, 23)
            from endMinutes in Gen.Choose(0, 59)
            from hoursWorkedMinutes in Gen.Choose(1, 1440)
            from isActive in Gen.Elements(true, false)
            from isDeleted in Gen.Elements(true, false)
            from dayOffset in Gen.Choose(1, 365)
            from modifiedDayOffset in Gen.Choose(1, 365)
            select new ShiftSyncCreateInput(
                Guid.NewGuid(),
                Guid.NewGuid().ToString(),
                ShiftName.Create(firstChar + new string(remainingChars)),
                ShiftIcon.Create(ShiftSyncPropertyTests.ValidEmojis[emojiIndex]),
                ShiftColor.Create(ShiftSyncPropertyTests.PaletteColors[colorIndex]),
                ShiftTime.Create(startHours, startMinutes),
                ShiftTime.Create(endHours, endMinutes),
                HoursWorked.Create(hoursWorkedMinutes),
                isActive,
                new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayOffset),
                new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayOffset + modifiedDayOffset),
                isDeleted);

        return gen.ToArbitrary();
    }

    private static ShiftSyncStateInput CreateSyncStateInput(int syncState, int dayOffset, int hourOffset)
    {
        DateTime baseDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = baseDate.AddDays(dayOffset).AddHours(hourOffset);

        return syncState switch
        {
            0 => new ShiftSyncStateInput(modifiedAt, null),
            1 => new ShiftSyncStateInput(modifiedAt, modifiedAt.AddHours(-1)),
            _ => new ShiftSyncStateInput(modifiedAt, modifiedAt.AddHours(1)),
        };
    }
}
