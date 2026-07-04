// <copyright file="ShiftModeSettingTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Domain;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Entities;
using NUnit.Framework;

/// <summary>
/// Unit and property-based tests for <see cref="ShiftModeSetting"/> entity.
/// Validates: Requirements 2.1, 2.2.
/// </summary>
[TestFixture]
[Category("Feature: gh35-shift-mode")]
public sealed class ShiftModeSettingTests
{
    /// <summary>Verifies Create sets Id to the provided value.</summary>
    [Test]
    public void Create_WithValidFields_SetsIdToProvidedValue()
    {
        Guid id = Guid.NewGuid();

        ShiftModeSetting setting = ShiftModeSetting.Create(id, "testuser");

        Assert.That(setting.Id, Is.EqualTo(id));
    }

    /// <summary>Verifies Create sets UserId correctly.</summary>
    [Test]
    public void Create_WithValidFields_SetsUserId()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        Assert.That(setting.UserId, Is.EqualTo("testuser"));
    }

    /// <summary>Verifies Create sets Enabled to false by default.</summary>
    [Test]
    public void Create_WithValidFields_SetsEnabledToFalse()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        Assert.That(setting.Enabled, Is.False);
    }

    /// <summary>Verifies Create sets ModifiedAt to approximately now (UTC).</summary>
    [Test]
    public void Create_WithValidFields_SetsModifiedAtToUtcNow()
    {
        DateTime before = DateTime.UtcNow;

        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        Assert.That(setting.ModifiedAt, Is.GreaterThanOrEqualTo(before));
        Assert.That(setting.ModifiedAt, Is.LessThanOrEqualTo(DateTime.UtcNow));
    }

    /// <summary>Verifies Create sets SyncedAt to null.</summary>
    [Test]
    public void Create_WithValidFields_SetsSyncedAtToNull()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        Assert.That(setting.SyncedAt, Is.Null);
    }

    /// <summary>Verifies Create sets IsDeleted to false.</summary>
    [Test]
    public void Create_WithValidFields_SetsIsDeletedToFalse()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        Assert.That(setting.IsDeleted, Is.False);
    }

    /// <summary>Verifies ApplySync overwrites Enabled field.</summary>
    [Test]
    public void ApplySync_WithNewValues_OverwritesEnabled()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        setting.ApplySync(true, DateTime.UtcNow.AddMinutes(-5), false);

        Assert.That(setting.Enabled, Is.True);
    }

    /// <summary>Verifies ApplySync overwrites ModifiedAt field.</summary>
    [Test]
    public void ApplySync_WithNewValues_OverwritesModifiedAt()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");
        DateTime remoteModifiedAt = new DateTime(2025, 6, 15, 10, 30, 0, DateTimeKind.Utc);

        setting.ApplySync(true, remoteModifiedAt, false);

        Assert.That(setting.ModifiedAt, Is.EqualTo(remoteModifiedAt));
    }

    /// <summary>Verifies ApplySync overwrites IsDeleted field.</summary>
    [Test]
    public void ApplySync_WithNewValues_OverwritesIsDeleted()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");

        setting.ApplySync(false, DateTime.UtcNow, true);

        Assert.That(setting.IsDeleted, Is.True);
    }

    /// <summary>Verifies ApplySync updates SyncedAt to current UTC.</summary>
    [Test]
    public void ApplySync_WhenCalled_SetsSyncedAtToUtcNow()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");
        DateTime before = DateTime.UtcNow;

        setting.ApplySync(true, DateTime.UtcNow.AddMinutes(-5), false);

        Assert.That(setting.SyncedAt, Is.Not.Null);
        Assert.That(setting.SyncedAt, Is.GreaterThanOrEqualTo(before));
        Assert.That(setting.SyncedAt, Is.LessThanOrEqualTo(DateTime.UtcNow));
    }

    /// <summary>Verifies ApplySync preserves Id and UserId.</summary>
    [Test]
    public void ApplySync_WhenCalled_PreservesIdAndUserId()
    {
        Guid id = Guid.NewGuid();
        ShiftModeSetting setting = ShiftModeSetting.Create(id, "testuser");

        setting.ApplySync(true, DateTime.UtcNow, false);

        Assert.Multiple(() =>
        {
            Assert.That(setting.Id, Is.EqualTo(id));
            Assert.That(setting.UserId, Is.EqualTo("testuser"));
        });
    }

    /// <summary>Verifies MarkSynced updates SyncedAt to current UTC.</summary>
    [Test]
    public void MarkSynced_WhenCalled_SetsSyncedAtToUtcNow()
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(Guid.NewGuid(), "testuser");
        DateTime before = DateTime.UtcNow;

        setting.MarkSynced();

        Assert.That(setting.SyncedAt, Is.Not.Null);
        Assert.That(setting.SyncedAt, Is.GreaterThanOrEqualTo(before));
        Assert.That(setting.SyncedAt, Is.LessThanOrEqualTo(DateTime.UtcNow));
    }

    /// <summary>Verifies MarkSynced does not modify other fields.</summary>
    [Test]
    public void MarkSynced_WhenCalled_DoesNotModifyOtherFields()
    {
        Guid id = Guid.NewGuid();
        ShiftModeSetting setting = ShiftModeSetting.Create(id, "testuser");
        bool originalEnabled = setting.Enabled;
        DateTime originalModifiedAt = setting.ModifiedAt;
        bool originalIsDeleted = setting.IsDeleted;

        setting.MarkSynced();

        Assert.Multiple(() =>
        {
            Assert.That(setting.Id, Is.EqualTo(id));
            Assert.That(setting.UserId, Is.EqualTo("testuser"));
            Assert.That(setting.Enabled, Is.EqualTo(originalEnabled));
            Assert.That(setting.ModifiedAt, Is.EqualTo(originalModifiedAt));
            Assert.That(setting.IsDeleted, Is.EqualTo(originalIsDeleted));
        });
    }

    /// <summary>Verifies CreateFromSync sets all fields from parameters.</summary>
    [Test]
    public void CreateFromSync_WithValidFields_SetsAllFieldsCorrectly()
    {
        Guid id = Guid.NewGuid();
        DateTime modifiedAt = new DateTime(2025, 6, 15, 10, 30, 0, DateTimeKind.Utc);
        DateTime before = DateTime.UtcNow;

        ShiftModeSetting setting = ShiftModeSetting.CreateFromSync(id, "syncuser", true, modifiedAt, false);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(setting.Id, Is.EqualTo(id));
            Assert.That(setting.UserId, Is.EqualTo("syncuser"));
            Assert.That(setting.Enabled, Is.True);
            Assert.That(setting.ModifiedAt, Is.EqualTo(modifiedAt));
            Assert.That(setting.IsDeleted, Is.False);
            Assert.That(setting.SyncedAt, Is.Not.Null);
            Assert.That(setting.SyncedAt, Is.GreaterThanOrEqualTo(before));
            Assert.That(setting.SyncedAt, Is.LessThanOrEqualTo(after));
        });
    }

    /// <summary>
    /// Property 1: For any valid userId and id, creating a ShiftModeSetting SHALL produce a record
    /// with enabled=false, modifiedAt no earlier than moment before creation, syncedAt=null,
    /// isDeleted=false, and preserve id and userId.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 2.1, 2.2</strong>
    /// </remarks>
    /// <param name="input">Valid shift mode setting creation input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftModeSettingArbitraries) })]
    [Category("Property 1: Setting state management")]
    public void Create_WithAnyValidFields_PersistsCorrectSystemFields(ShiftModeSettingCreateInput input)
    {
        DateTime before = DateTime.UtcNow;

        ShiftModeSetting setting = ShiftModeSetting.Create(input.Id, input.UserId);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(setting.Id, Is.EqualTo(input.Id), "Id equals provided Id");
            Assert.That(setting.Id, Is.Not.EqualTo(Guid.Empty), "Id is non-empty");
            Assert.That(setting.UserId, Is.EqualTo(input.UserId), "UserId preserved");
            Assert.That(setting.Enabled, Is.False, "Enabled defaults to false");
            Assert.That(setting.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(setting.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(setting.SyncedAt, Is.Null, "SyncedAt is null");
            Assert.That(setting.IsDeleted, Is.False, "IsDeleted is false");
        });
    }

    /// <summary>
    /// Property 1: For any valid ApplySync parameters, the method SHALL overwrite enabled, modifiedAt,
    /// isDeleted with the provided values, set syncedAt to current UTC, and preserve id and userId.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 2.1, 2.2</strong>
    /// </remarks>
    /// <param name="createInput">Input for creating the initial setting.</param>
    /// <param name="syncInput">Input for applying sync.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftModeSettingArbitraries) })]
    [Category("Property 1: Setting state management")]
    public void ApplySync_WithAnyValidFields_OverwritesMutableFieldsAndSetsSyncedAt(
        ShiftModeSettingCreateInput createInput,
        ShiftModeSettingSyncInput syncInput)
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(createInput.Id, createInput.UserId);
        Guid originalId = setting.Id;
        string originalUserId = setting.UserId;

        DateTime before = DateTime.UtcNow;

        setting.ApplySync(syncInput.Enabled, syncInput.ModifiedAt, syncInput.IsDeleted);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(setting.Id, Is.EqualTo(originalId), "Id preserved");
            Assert.That(setting.UserId, Is.EqualTo(originalUserId), "UserId preserved");
            Assert.That(setting.Enabled, Is.EqualTo(syncInput.Enabled), "Enabled overwritten");
            Assert.That(setting.ModifiedAt, Is.EqualTo(syncInput.ModifiedAt), "ModifiedAt overwritten");
            Assert.That(setting.IsDeleted, Is.EqualTo(syncInput.IsDeleted), "IsDeleted overwritten");
            Assert.That(setting.SyncedAt, Is.Not.Null, "SyncedAt is not null");
            Assert.That(setting.SyncedAt, Is.GreaterThanOrEqualTo(before), "SyncedAt >= before");
            Assert.That(setting.SyncedAt, Is.LessThanOrEqualTo(after), "SyncedAt <= after");
        });
    }

    /// <summary>
    /// Property 1: For any existing ShiftModeSetting, MarkSynced SHALL only update syncedAt
    /// to the current UTC timestamp without modifying any other field.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 2.1, 2.2</strong>
    /// </remarks>
    /// <param name="input">Valid shift mode setting creation input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftModeSettingArbitraries) })]
    [Category("Property 1: Setting state management")]
    public void MarkSynced_WithAnyExistingSetting_OnlyUpdatesSyncedAt(ShiftModeSettingCreateInput input)
    {
        ShiftModeSetting setting = ShiftModeSetting.Create(input.Id, input.UserId);
        Guid originalId = setting.Id;
        string originalUserId = setting.UserId;
        bool originalEnabled = setting.Enabled;
        DateTime originalModifiedAt = setting.ModifiedAt;
        bool originalIsDeleted = setting.IsDeleted;

        DateTime before = DateTime.UtcNow;

        setting.MarkSynced();

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(setting.Id, Is.EqualTo(originalId), "Id unchanged");
            Assert.That(setting.UserId, Is.EqualTo(originalUserId), "UserId unchanged");
            Assert.That(setting.Enabled, Is.EqualTo(originalEnabled), "Enabled unchanged");
            Assert.That(setting.ModifiedAt, Is.EqualTo(originalModifiedAt), "ModifiedAt unchanged");
            Assert.That(setting.IsDeleted, Is.EqualTo(originalIsDeleted), "IsDeleted unchanged");
            Assert.That(setting.SyncedAt, Is.Not.Null, "SyncedAt is not null");
            Assert.That(setting.SyncedAt, Is.GreaterThanOrEqualTo(before), "SyncedAt >= before");
            Assert.That(setting.SyncedAt, Is.LessThanOrEqualTo(after), "SyncedAt <= after");
        });
    }

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

    /// <summary>
    /// Input record for shift mode setting creation property tests.
    /// </summary>
#pragma warning disable SA1313 // Parameter names should begin with lower-case letter
    public record ShiftModeSettingCreateInput(
        Guid Id,
        string UserId);

    /// <summary>
    /// Input record for shift mode setting sync property tests.
    /// </summary>
    public record ShiftModeSettingSyncInput(
        bool Enabled,
        DateTime ModifiedAt,
        bool IsDeleted);
#pragma warning restore SA1313 // Parameter names should begin with lower-case letter
}
