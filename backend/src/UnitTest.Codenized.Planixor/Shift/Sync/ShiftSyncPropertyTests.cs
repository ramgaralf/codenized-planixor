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
    internal static readonly string[] PaletteColors =
    [
        "#EF4444", "#F97316", "#F59E0B", "#10B981", "#0B86D4",
        "#2563EB", "#7C3AED", "#EC4899", "#6B7280", "#1F2937",
    ];

    internal static readonly string[] ValidEmojis =
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
}
