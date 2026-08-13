// <copyright file="ReminderSyncArbitraries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Sync;

using global::Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Provides FsCheck arbitrary generators for reminder sync-related test inputs.
/// </summary>
public sealed class ReminderSyncArbitraries
{
    /// <summary>Generates arbitrary sync state inputs for push filter tests.</summary>
    /// <returns>An arbitrary for arrays of <see cref="ReminderSyncStateInput"/>.</returns>
    public static Arbitrary<ReminderSyncStateInput[]> GenerateReminderSyncStateInputArray()
    {
        Gen<ReminderSyncStateInput> singleGen =
            from syncState in Gen.Choose(0, 2)
            from dayOffset in Gen.Choose(1, 365)
            from hourOffset in Gen.Choose(0, 23)
            select CreateSyncStateInput(syncState, dayOffset, hourOffset);

        Gen<ReminderSyncStateInput[]> gen =
            from count in Gen.Choose(1, 20)
            from items in singleGen.ArrayOf(count)
            select items;

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary conflict resolution inputs.</summary>
    /// <returns>An arbitrary for <see cref="ReminderConflictResolutionInput"/>.</returns>
    public static Arbitrary<ReminderConflictResolutionInput> GenerateConflictResolutionInput()
    {
        DateTime baseDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        Gen<ReminderConflictResolutionInput> gen =
            from scenario in Gen.Choose(0, 2)
            from localDayOffset in Gen.Choose(0, 365)
            from localHourOffset in Gen.Choose(0, 23)
            from remoteDayOffset in Gen.Choose(0, 365)
            from remoteHourOffset in Gen.Choose(0, 23)
            select scenario switch
            {
                0 => new ReminderConflictResolutionInput(
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset),
                    baseDate.AddDays(remoteDayOffset).AddHours(remoteHourOffset + 24)),
                1 => new ReminderConflictResolutionInput(
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset + 24),
                    baseDate.AddDays(remoteDayOffset).AddHours(remoteHourOffset)),
                _ => new ReminderConflictResolutionInput(
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset),
                    baseDate.AddDays(localDayOffset).AddHours(localHourOffset)),
            };

        return gen.ToArbitrary();
    }

    /// <summary>Generates arbitrary valid reminder inputs for pull merge tests.</summary>
    /// <returns>An arbitrary for <see cref="ReminderSyncCreateInput"/>.</returns>
    public static Arbitrary<ReminderSyncCreateInput> GenerateReminderSyncCreateInput()
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

        Gen<ReminderSyncCreateInput> gen =
            from firstChar in alphanumChar
            from remainingLength in Gen.Choose(0, 49)
            from remainingChars in anyNameChar.ArrayOf(remainingLength)
            from emojiIndex in Gen.Choose(0, ReminderSyncPropertyTests.ValidEmojis.Length - 1)
            from colorIndex in Gen.Choose(0, ReminderSyncPropertyTests.PaletteColors.Length - 1)
            from isActive in Gen.Elements(true, false)
            from isDeleted in Gen.Elements(true, false)
            from dayOffset in Gen.Choose(1, 365)
            from modifiedDayOffset in Gen.Choose(1, 365)
            select new ReminderSyncCreateInput(
                Guid.NewGuid(),
                Guid.NewGuid().ToString(),
                ReminderName.Create(firstChar + new string(remainingChars)),
                ReminderIcon.Create(ReminderSyncPropertyTests.ValidEmojis[emojiIndex]),
                ReminderColor.Create(ReminderSyncPropertyTests.PaletteColors[colorIndex]),
                isActive,
                new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayOffset),
                new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayOffset + modifiedDayOffset),
                isDeleted);

        return gen.ToArbitrary();
    }

    private static ReminderSyncStateInput CreateSyncStateInput(int syncState, int dayOffset, int hourOffset)
    {
        DateTime baseDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = baseDate.AddDays(dayOffset).AddHours(hourOffset);

        return syncState switch
        {
            0 => new ReminderSyncStateInput(modifiedAt, null),
            1 => new ReminderSyncStateInput(modifiedAt, modifiedAt.AddHours(-1)),
            _ => new ReminderSyncStateInput(modifiedAt, modifiedAt.AddHours(1)),
        };
    }
}
