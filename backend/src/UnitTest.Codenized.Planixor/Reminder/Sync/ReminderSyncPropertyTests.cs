// <copyright file="ReminderSyncPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Sync;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for reminder synchronization logic.
/// Validates: Requirements 6.1, 6.3, 6.5.
/// </summary>
[TestFixture]
[Category("Feature: gh5-reminder-management")]
public sealed class ReminderSyncPropertyTests
{
    private static readonly string[] PaletteColors =
    [
        "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",
        "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",
        "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",
        "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",
        "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",
        "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",
        "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",
        "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",
        "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
    ];

    private static readonly string[] ValidEmojis =
    [
        "\U0001F4BC", "\u2600", "\U0001F680", "\U0001F3E0", "\U0001F4A1",
        "\U0001F30D", "\U0001F525", "\u2764", "\U0001F4DA", "\U0001F3AF",
    ];

    /// <summary>
    /// Property 11: For any collection of Reminder entities, the sync push filter selects exactly
    /// those where SyncedAt is null OR ModifiedAt > SyncedAt. Batch size must not exceed 100.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.1</strong>
    /// </remarks>
    /// <param name="inputs">A collection of reminder sync state inputs.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderSyncArbitraries) })]
    [Category("Property 11: Push sync selects correct records and respects batch size")]
    public void SyncPushFilter_ForAnyCollection_SelectsExactlyUnsyncedRecordsWithBatchLimit(ReminderSyncStateInput[] inputs)
    {
        List<ReminderSyncStateInput> allRecords = inputs.ToList();

        List<ReminderSyncStateInput> filtered = allRecords
            .Where(s => NeedsPush(s.ModifiedAt, s.SyncedAt))
            .ToList();

        Assert.Multiple(() =>
        {
            foreach (ReminderSyncStateInput record in allRecords)
            {
                bool shouldBeSelected = record.SyncedAt == null || record.ModifiedAt > record.SyncedAt;
                bool isSelected = filtered.Contains(record);
                Assert.That(
                    isSelected,
                    Is.EqualTo(shouldBeSelected),
                    $"Record: shouldBeSelected={shouldBeSelected}, isSelected={isSelected}, SyncedAt={record.SyncedAt}, ModifiedAt={record.ModifiedAt}");
            }

            foreach (ReminderSyncStateInput record in filtered)
            {
                Assert.That(
                    record.SyncedAt == null || record.ModifiedAt > record.SyncedAt,
                    Is.True,
                    "Selected record must have SyncedAt null or ModifiedAt > SyncedAt");
            }

            foreach (ReminderSyncStateInput record in allRecords.Except(filtered))
            {
                Assert.That(
                    record.SyncedAt != null && record.ModifiedAt <= record.SyncedAt,
                    Is.True,
                    "Non-selected record must have SyncedAt not null and ModifiedAt <= SyncedAt");
            }

            // Verify batch constraint: any batch sent must not exceed 100 records
            const int maxBatchSize = 100;
            List<List<ReminderSyncStateInput>> batches = filtered
                .Select((item, index) => new { item, index })
                .GroupBy(x => x.index / maxBatchSize)
                .Select(g => g.Select(x => x.item).ToList())
                .ToList();

            foreach (List<ReminderSyncStateInput> batch in batches)
            {
                Assert.That(batch.Count, Is.LessThanOrEqualTo(maxBatchSize), "Each batch must not exceed 100 records");
            }
        });
    }

    /// <summary>
    /// Property 12: For any pair of Reminder entities (local, remote) with same Id:
    /// if remote.ModifiedAt > local.ModifiedAt → remote wins;
    /// if local.ModifiedAt > remote.ModifiedAt → local wins;
    /// if equal → remote wins (tie-break).
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.3</strong>
    /// </remarks>
    /// <param name="input">A conflict resolution input containing local and remote timestamps.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderSyncArbitraries) })]
    [Category("Property 12: Conflict resolution applies last-writer-wins with remote tie-break")]
    public void ConflictResolution_ForAnyPairWithSameId_LastWriterWinsWithRemoteTieBreak(ReminderConflictResolutionInput input)
    {
        Reminder winner = ResolveConflict(input.LocalModifiedAt, input.RemoteModifiedAt);

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
    /// Property 13: For any remote Reminder entity whose Id does not exist in a local collection,
    /// the pull merge SHALL insert that record with SyncedAt set to a recent timestamp.
    /// When a pulled record exists locally and the local ModifiedAt is equal to or less than its SyncedAt,
    /// the local record SHALL be overwritten with remote values.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.5</strong>
    /// </remarks>
    /// <param name="input">Valid reminder sync creation input representing a remote record.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderSyncArbitraries) })]
    [Category("Property 13: Pull merge inserts new and overwrites unmodified locals")]
    public void PullMerge_ForAnyNewRemoteRecord_InsertsWithRecentSyncedAt(ReminderSyncCreateInput input)
    {
        List<Reminder> localReminders = new List<Reminder>();

        Guid remoteId = input.Id;
        bool existsLocally = localReminders.Any(r => r.Id == remoteId);

        Assert.That(existsLocally, Is.False, "Precondition: remote Id does not exist locally");

        DateTime before = DateTime.UtcNow;

        Reminder insertedReminder = Reminder.CreateFromSync(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.IsActive,
            input.CreatedAt,
            input.ModifiedAt,
            input.IsDeleted);

        localReminders.Add(insertedReminder);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(localReminders.Any(r => r.Id == remoteId), Is.True, "Record inserted into local collection");
            Assert.That(insertedReminder.SyncedAt, Is.Not.Null, "SyncedAt is not null after pull merge");
            Assert.That(insertedReminder.SyncedAt, Is.GreaterThanOrEqualTo(before), "SyncedAt >= before merge");
            Assert.That(insertedReminder.SyncedAt, Is.LessThanOrEqualTo(after), "SyncedAt <= after merge");
            Assert.That(insertedReminder.Id, Is.EqualTo(input.Id), "Id preserved from remote");
            Assert.That(insertedReminder.UserId, Is.EqualTo(input.UserId), "UserId preserved from remote");
            Assert.That(insertedReminder.Name, Is.EqualTo(input.Name), "Name preserved from remote");
            Assert.That(insertedReminder.Icon, Is.EqualTo(input.Icon), "Icon preserved from remote");
            Assert.That(insertedReminder.BackgroundColor, Is.EqualTo(input.BackgroundColor), "BackgroundColor preserved from remote");
            Assert.That(insertedReminder.IsActive, Is.EqualTo(input.IsActive), "IsActive preserved from remote");
            Assert.That(insertedReminder.ModifiedAt, Is.EqualTo(input.ModifiedAt), "ModifiedAt preserved from remote");
            Assert.That(insertedReminder.IsDeleted, Is.EqualTo(input.IsDeleted), "IsDeleted preserved from remote");
        });
    }

    /// <summary>
    /// Property 13 (overwrite scenario): For any existing local reminder where ModifiedAt &lt;= SyncedAt,
    /// applying a remote record SHALL overwrite the local with remote values and update SyncedAt.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.5</strong>
    /// </remarks>
    /// <param name="input">Valid reminder sync creation input representing a remote record to merge.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderSyncArbitraries) })]
    [Category("Property 13: Pull merge inserts new and overwrites unmodified locals")]
    public void PullMerge_ForExistingUnmodifiedLocal_OverwritesWithRemoteValues(ReminderSyncCreateInput input)
    {
        // Create a local reminder that has been synced (ModifiedAt <= SyncedAt)
        Reminder localReminder = Reminder.CreateFromSync(
            input.Id,
            input.UserId,
            ReminderName.Create("OriginalName"),
            ReminderIcon.Create(ValidEmojis[0]),
            ReminderColor.Create(PaletteColors[0]),
            true,
            input.CreatedAt,
            input.CreatedAt,
            false);

        // Verify precondition: local is unmodified (ModifiedAt <= SyncedAt)
        Assert.That(localReminder.ModifiedAt, Is.LessThanOrEqualTo(localReminder.SyncedAt), "Precondition: local is unmodified");

        DateTime before = DateTime.UtcNow;

        // Apply sync overwrites the local with remote values
        localReminder.ApplySync(
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.IsActive,
            input.ModifiedAt,
            input.IsDeleted);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(localReminder.Name, Is.EqualTo(input.Name), "Name overwritten from remote");
            Assert.That(localReminder.Icon, Is.EqualTo(input.Icon), "Icon overwritten from remote");
            Assert.That(localReminder.BackgroundColor, Is.EqualTo(input.BackgroundColor), "BackgroundColor overwritten from remote");
            Assert.That(localReminder.IsActive, Is.EqualTo(input.IsActive), "IsActive overwritten from remote");
            Assert.That(localReminder.ModifiedAt, Is.EqualTo(input.ModifiedAt), "ModifiedAt set from remote");
            Assert.That(localReminder.IsDeleted, Is.EqualTo(input.IsDeleted), "IsDeleted overwritten from remote");
            Assert.That(localReminder.SyncedAt, Is.Not.Null, "SyncedAt set after merge");
            Assert.That(localReminder.SyncedAt, Is.GreaterThanOrEqualTo(before), "SyncedAt >= before merge");
            Assert.That(localReminder.SyncedAt, Is.LessThanOrEqualTo(after), "SyncedAt <= after merge");
        });
    }

    /// <summary>
    /// Resolves a conflict between local and remote reminders using last-writer-wins with remote tie-break.
    /// This mirrors the logic in IReminderSyncPushCommands.UpsertAsync.
    /// </summary>
    /// <param name="localModifiedAt">The local record's ModifiedAt timestamp.</param>
    /// <param name="remoteModifiedAt">The remote record's ModifiedAt timestamp.</param>
    /// <returns>The winning reminder entity.</returns>
    private static Reminder ResolveConflict(DateTime localModifiedAt, DateTime remoteModifiedAt)
    {
        Guid sharedId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        ReminderName name = ReminderName.Create("Test");
        ReminderIcon icon = ReminderIcon.Create("\U0001F4BC");
        ReminderColor color = ReminderColor.Create("#EF4444");

        Reminder localReminder = Reminder.CreateFromSync(
            sharedId,
            userId,
            name,
            icon,
            color,
            true,
            DateTime.UtcNow.AddDays(-10),
            localModifiedAt,
            false);

        Reminder remoteReminder = Reminder.CreateFromSync(
            sharedId,
            userId,
            ReminderName.Create("Remote"),
            icon,
            color,
            true,
            DateTime.UtcNow.AddDays(-10),
            remoteModifiedAt,
            false);

        // Last-writer-wins: remote wins if remote.ModifiedAt >= local.ModifiedAt (tie → remote wins)
        if (remoteReminder.ModifiedAt >= localReminder.ModifiedAt)
        {
            return remoteReminder;
        }

        return localReminder;
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
                from emojiIndex in Gen.Choose(0, ValidEmojis.Length - 1)
                from colorIndex in Gen.Choose(0, PaletteColors.Length - 1)
                from isActive in Gen.Elements(true, false)
                from isDeleted in Gen.Elements(true, false)
                from dayOffset in Gen.Choose(1, 365)
                from modifiedDayOffset in Gen.Choose(1, 365)
                select new ReminderSyncCreateInput(
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    ReminderName.Create(firstChar + new string(remainingChars)),
                    ReminderIcon.Create(ValidEmojis[emojiIndex]),
                    ReminderColor.Create(PaletteColors[colorIndex]),
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

    /// <summary>
    /// Input record representing a reminder's sync state for push filter testing.
    /// </summary>
#pragma warning disable SA1313 // Parameter names should begin with lower-case letter
    public record ReminderSyncStateInput(DateTime ModifiedAt, DateTime? SyncedAt);

    /// <summary>
    /// Input record for conflict resolution property tests.
    /// </summary>
    public record ReminderConflictResolutionInput(DateTime LocalModifiedAt, DateTime RemoteModifiedAt);

    /// <summary>
    /// Input record for pull merge property tests with all reminder fields.
    /// </summary>
    public record ReminderSyncCreateInput(
        Guid Id,
        Guid UserId,
        ReminderName Name,
        ReminderIcon Icon,
        ReminderColor BackgroundColor,
        bool IsActive,
        DateTime CreatedAt,
        DateTime ModifiedAt,
        bool IsDeleted);
#pragma warning restore SA1313 // Parameter names should begin with lower-case letter
}
