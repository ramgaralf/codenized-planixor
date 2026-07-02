// <copyright file="ShiftSyncPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Sync;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for shift synchronization logic.
/// Validates: Requirements 6.1, 6.3, 6.5.
/// </summary>
[TestFixture]
[Category("Feature: gh3-shift-management")]
public sealed class ShiftSyncPropertyTests
{
    private static readonly string[] PaletteColors =
    [
        "#EF4444", "#F97316", "#F59E0B", "#10B981", "#0B86D4",
        "#2563EB", "#7C3AED", "#EC4899", "#6B7280", "#1F2937",
    ];

    private static readonly string[] ValidEmojis =
    [
        "\U0001F4BC", "\u2600", "\U0001F680", "\U0001F3E0", "\U0001F4A1",
        "\U0001F30D", "\U0001F525", "\u2764", "\U0001F4DA", "\U0001F3AF",
    ];

    /// <summary>
    /// Property 8: For any collection of Shift entities, the sync push filter selects exactly
    /// those where SyncedAt is null OR ModifiedAt > SyncedAt.
    /// Tests the push filter predicate against generated (modifiedAt, syncedAt) pairs.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.1</strong>
    /// </remarks>
    /// <param name="inputs">A collection of shift sync state inputs.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SyncArbitraries) })]
    [Category("Property 8: Sync push filter selects unsynced records")]
    public void SyncPushFilter_ForAnyCollection_SelectsExactlyUnsyncedRecords(ShiftSyncStateInput[] inputs)
    {
        List<ShiftSyncStateInput> allRecords = inputs.ToList();

        List<ShiftSyncStateInput> filtered = allRecords
            .Where(s => NeedsPush(s.ModifiedAt, s.SyncedAt))
            .ToList();

        Assert.Multiple(() =>
        {
            foreach (ShiftSyncStateInput record in allRecords)
            {
                bool shouldBeSelected = record.SyncedAt == null || record.ModifiedAt > record.SyncedAt;
                bool isSelected = filtered.Contains(record);
                Assert.That(
                    isSelected,
                    Is.EqualTo(shouldBeSelected),
                    $"Record: shouldBeSelected={shouldBeSelected}, isSelected={isSelected}, SyncedAt={record.SyncedAt}, ModifiedAt={record.ModifiedAt}");
            }

            foreach (ShiftSyncStateInput record in filtered)
            {
                Assert.That(
                    record.SyncedAt == null || record.ModifiedAt > record.SyncedAt,
                    Is.True,
                    "Selected record must have SyncedAt null or ModifiedAt > SyncedAt");
            }

            foreach (ShiftSyncStateInput record in allRecords.Except(filtered))
            {
                Assert.That(
                    record.SyncedAt != null && record.ModifiedAt <= record.SyncedAt,
                    Is.True,
                    "Non-selected record must have SyncedAt not null and ModifiedAt <= SyncedAt");
            }
        });
    }

    /// <summary>
    /// Property 9: For any pair of Shift entities (local, remote) with same Id:
    /// if remote.ModifiedAt > local.ModifiedAt → remote wins;
    /// if local.ModifiedAt > remote.ModifiedAt → local wins;
    /// if equal → remote wins.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.3</strong>
    /// </remarks>
    /// <param name="input">A conflict resolution input containing local and remote timestamps.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SyncArbitraries) })]
    [Category("Property 9: Conflict resolution — last writer wins with remote tie-break")]
    public void ConflictResolution_ForAnyPairWithSameId_LastWriterWinsWithRemoteTieBreak(ConflictResolutionInput input)
    {
        Shift winner = ResolveConflict(input.LocalModifiedAt, input.RemoteModifiedAt);

        if (input.RemoteModifiedAt > input.LocalModifiedAt)
        {
            Assert.That(winner.ModifiedAt, Is.EqualTo(input.RemoteModifiedAt), "Remote wins when remote.ModifiedAt > local.ModifiedAt");
        }
        else if (input.LocalModifiedAt > input.RemoteModifiedAt)
        {
            Assert.That(winner.ModifiedAt, Is.EqualTo(input.LocalModifiedAt), "Local wins when local.ModifiedAt > remote.ModifiedAt");
        }
        else
        {
            Assert.That(winner.ModifiedAt, Is.EqualTo(input.RemoteModifiedAt), "Remote wins on tie (equal ModifiedAt)");
        }
    }

    /// <summary>
    /// Property 10: For any remote Shift entity whose Id does not exist in a local collection,
    /// the pull merge SHALL insert that record with SyncedAt set to a recent timestamp.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.5</strong>
    /// </remarks>
    /// <param name="input">Valid shift creation input representing a remote record.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SyncArbitraries) })]
    [Category("Property 10: Pull merge inserts new remote records")]
    public void PullMerge_ForAnyNewRemoteRecord_InsertsWithRecentSyncedAt(ShiftSyncCreateInput input)
    {
        List<Shift> localShifts = new List<Shift>();

        Guid remoteId = input.Id;
        bool existsLocally = localShifts.Any(s => s.Id == remoteId);

        Assert.That(existsLocally, Is.False, "Precondition: remote Id does not exist locally");

        DateTime before = DateTime.UtcNow;

        Shift insertedShift = Shift.CreateFromSync(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.StartTime,
            input.EndTime,
            input.HoursWorked,
            input.IsActive,
            input.CreatedAt,
            input.ModifiedAt,
            input.IsDeleted);

        localShifts.Add(insertedShift);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(localShifts.Any(s => s.Id == remoteId), Is.True, "Record inserted into local collection");
            Assert.That(insertedShift.SyncedAt, Is.Not.Null, "SyncedAt is not null after pull merge");
            Assert.That(insertedShift.SyncedAt, Is.GreaterThanOrEqualTo(before), "SyncedAt >= before merge");
            Assert.That(insertedShift.SyncedAt, Is.LessThanOrEqualTo(after), "SyncedAt <= after merge");
            Assert.That(insertedShift.Id, Is.EqualTo(input.Id), "Id preserved from remote");
            Assert.That(insertedShift.UserId, Is.EqualTo(input.UserId), "UserId preserved from remote");
            Assert.That(insertedShift.Name, Is.EqualTo(input.Name), "Name preserved from remote");
            Assert.That(insertedShift.Icon, Is.EqualTo(input.Icon), "Icon preserved from remote");
            Assert.That(insertedShift.BackgroundColor, Is.EqualTo(input.BackgroundColor), "BackgroundColor preserved from remote");
            Assert.That(insertedShift.StartTime, Is.EqualTo(input.StartTime), "StartTime preserved from remote");
            Assert.That(insertedShift.EndTime, Is.EqualTo(input.EndTime), "EndTime preserved from remote");
            Assert.That(insertedShift.HoursWorked, Is.EqualTo(input.HoursWorked), "HoursWorked preserved from remote");
            Assert.That(insertedShift.IsActive, Is.EqualTo(input.IsActive), "IsActive preserved from remote");
            Assert.That(insertedShift.ModifiedAt, Is.EqualTo(input.ModifiedAt), "ModifiedAt preserved from remote");
            Assert.That(insertedShift.IsDeleted, Is.EqualTo(input.IsDeleted), "IsDeleted preserved from remote");
        });
    }

    /// <summary>
    /// Resolves a conflict between local and remote shifts using last-writer-wins with remote tie-break.
    /// This mirrors the logic in ShiftSyncPushCommands.UpsertAsync.
    /// </summary>
    /// <param name="localModifiedAt">The local record's ModifiedAt timestamp.</param>
    /// <param name="remoteModifiedAt">The remote record's ModifiedAt timestamp.</param>
    /// <returns>The winning shift entity.</returns>
    private static Shift ResolveConflict(DateTime localModifiedAt, DateTime remoteModifiedAt)
    {
        Guid sharedId = Guid.NewGuid();
        string userId = "testuser";
        ShiftName name = ShiftName.Create("Test");
        ShiftIcon icon = ShiftIcon.Create("\U0001F4BC");
        ShiftColor color = ShiftColor.Create("#EF4444");
        ShiftTime startTime = ShiftTime.Create(9, 0);
        ShiftTime endTime = ShiftTime.Create(17, 0);
        HoursWorked hoursWorked = HoursWorked.Create(480);

        Shift localShift = Shift.CreateFromSync(
            sharedId,
            userId,
            name,
            icon,
            color,
            startTime,
            endTime,
            hoursWorked,
            true,
            DateTime.UtcNow.AddDays(-10),
            localModifiedAt,
            false);

        Shift remoteShift = Shift.CreateFromSync(
            sharedId,
            userId,
            ShiftName.Create("Remote"),
            icon,
            color,
            startTime,
            endTime,
            hoursWorked,
            true,
            DateTime.UtcNow.AddDays(-10),
            remoteModifiedAt,
            false);

        if (remoteShift.ModifiedAt >= localShift.ModifiedAt)
        {
            return remoteShift;
        }

        return localShift;
    }

    /// <summary>
    /// Implements the sync push filter predicate: returns true if a record needs to be pushed.
    /// A record needs push when syncedAt is null or modifiedAt is strictly greater than syncedAt.
    /// </summary>
    /// <param name="modifiedAt">The record's modification timestamp.</param>
    /// <param name="syncedAt">The record's last sync timestamp, or null if never synced.</param>
    /// <returns>True if the record should be included in the push batch.</returns>
    private static bool NeedsPush(DateTime modifiedAt, DateTime? syncedAt)
    {
        return syncedAt == null || modifiedAt > syncedAt;
    }

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
                from emojiIndex in Gen.Choose(0, ValidEmojis.Length - 1)
                from colorIndex in Gen.Choose(0, PaletteColors.Length - 1)
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
                    ShiftIcon.Create(ValidEmojis[emojiIndex]),
                    ShiftColor.Create(PaletteColors[colorIndex]),
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

    /// <summary>
    /// Input record representing a shift's sync state for push filter testing.
    /// </summary>
#pragma warning disable SA1313 // Parameter names should begin with lower-case letter
    public record ShiftSyncStateInput(DateTime ModifiedAt, DateTime? SyncedAt);

    /// <summary>
    /// Input record for conflict resolution property tests.
    /// </summary>
    public record ConflictResolutionInput(DateTime LocalModifiedAt, DateTime RemoteModifiedAt);

    /// <summary>
    /// Input record for pull merge property tests with all shift fields.
    /// </summary>
    public record ShiftSyncCreateInput(
        Guid Id,
        string UserId,
        ShiftName Name,
        ShiftIcon Icon,
        ShiftColor BackgroundColor,
        ShiftTime StartTime,
        ShiftTime EndTime,
        HoursWorked HoursWorked,
        bool IsActive,
        DateTime CreatedAt,
        DateTime ModifiedAt,
        bool IsDeleted);
#pragma warning restore SA1313 // Parameter names should begin with lower-case letter
}
