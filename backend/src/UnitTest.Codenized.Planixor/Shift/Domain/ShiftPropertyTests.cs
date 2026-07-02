// <copyright file="ShiftPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Domain;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for the <see cref="Shift"/> entity.
/// Validates: Requirements 1.1, 3.2, 4.2, 4.5, 4.7, 5.2.
/// </summary>
[TestFixture]
[Category("Feature: gh3-shift-management")]
public sealed class ShiftPropertyTests
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
    /// Property 1: For any valid set of shift field values, creating a shift SHALL produce a record
    /// with a non-empty UUID, modifiedAt no earlier than moment before creation, syncedAt = null,
    /// isDeleted = false, isActive = true, all fields preserved.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.1, 4.7</strong>
    /// </remarks>
    /// <param name="input">Valid shift creation input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftArbitraries) })]
    [Category("Property 1: Shift creation persists correct system fields")]
    public void Create_WithAnyValidFields_PersistsCorrectSystemFields(ShiftCreateInput input)
    {
        DateTime before = DateTime.UtcNow;

        Shift shift = Shift.Create(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.StartTime,
            input.EndTime,
            input.HoursWorked,
            input.CreatedAt);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(shift.Id, Is.EqualTo(input.Id), "Id equals provided Id");
            Assert.That(shift.Id, Is.Not.EqualTo(Guid.Empty), "Id is non-empty");
            Assert.That(shift.UserId, Is.EqualTo(input.UserId), "UserId preserved");
            Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(shift.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(shift.SyncedAt, Is.Null, "SyncedAt is null");
            Assert.That(shift.IsDeleted, Is.False, "IsDeleted is false");
            Assert.That(shift.IsActive, Is.True, "IsActive is true");
            Assert.That(shift.Name, Is.EqualTo(input.Name), "Name preserved");
            Assert.That(shift.Icon, Is.EqualTo(input.Icon), "Icon preserved");
            Assert.That(shift.BackgroundColor, Is.EqualTo(input.BackgroundColor), "BackgroundColor preserved");
            Assert.That(shift.StartTime, Is.EqualTo(input.StartTime), "StartTime preserved");
            Assert.That(shift.EndTime, Is.EqualTo(input.EndTime), "EndTime preserved");
            Assert.That(shift.HoursWorked, Is.EqualTo(input.HoursWorked), "HoursWorked preserved");
            Assert.That(shift.CreatedAt, Is.EqualTo(input.CreatedAt), "CreatedAt preserved");
        });
    }

    /// <summary>
    /// Property 5: For any existing non-deleted shift and valid modifications, updating SHALL
    /// preserve original id/syncedAt/isDeleted, set modifiedAt >= moment before update, persist new values.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 3.2</strong>
    /// </remarks>
    /// <param name="createInput">Input for creating the initial shift.</param>
    /// <param name="updateInput">Input for updating the shift.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftArbitraries) })]
    [Category("Property 5: Shift update preserves identity fields")]
    public void Update_WithAnyValidModifications_PreservesIdentityFields(
        ShiftCreateInput createInput,
        ShiftUpdateInput updateInput)
    {
        Shift shift = Shift.Create(
            createInput.Id,
            createInput.UserId,
            createInput.Name,
            createInput.Icon,
            createInput.BackgroundColor,
            createInput.StartTime,
            createInput.EndTime,
            createInput.HoursWorked,
            createInput.CreatedAt);

        Guid originalId = shift.Id;
        DateTime? originalSyncedAt = shift.SyncedAt;
        bool originalIsDeleted = shift.IsDeleted;

        DateTime before = DateTime.UtcNow;

        shift.Update(
            updateInput.Name,
            updateInput.Icon,
            updateInput.BackgroundColor,
            updateInput.StartTime,
            updateInput.EndTime,
            updateInput.HoursWorked);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(shift.Id, Is.EqualTo(originalId), "Id preserved");
            Assert.That(shift.SyncedAt, Is.EqualTo(originalSyncedAt), "SyncedAt preserved");
            Assert.That(shift.IsDeleted, Is.EqualTo(originalIsDeleted), "IsDeleted preserved");
            Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(shift.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(shift.Name, Is.EqualTo(updateInput.Name), "New Name persisted");
            Assert.That(shift.Icon, Is.EqualTo(updateInput.Icon), "New Icon persisted");
            Assert.That(shift.BackgroundColor, Is.EqualTo(updateInput.BackgroundColor), "New BackgroundColor persisted");
            Assert.That(shift.StartTime, Is.EqualTo(updateInput.StartTime), "New StartTime persisted");
            Assert.That(shift.EndTime, Is.EqualTo(updateInput.EndTime), "New EndTime persisted");
            Assert.That(shift.HoursWorked, Is.EqualTo(updateInput.HoursWorked), "New HoursWorked persisted");
        });
    }

    /// <summary>
    /// Property 6: For any shift with isActive = V, toggling SHALL set isActive to !V
    /// and update modifiedAt, without modifying other fields.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 4.2, 4.5</strong>
    /// </remarks>
    /// <param name="input">Valid shift creation input.</param>
    /// <param name="initialActive">Whether the shift starts active.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftArbitraries) })]
    [Category("Property 6: Toggle active status")]
    public void ToggleActive_WithAnyShift_FlipsIsActiveAndUpdatesModifiedAtOnly(
        ShiftCreateInput input,
        bool initialActive)
    {
        Shift shift = Shift.Create(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.StartTime,
            input.EndTime,
            input.HoursWorked,
            input.CreatedAt);

        if (!initialActive)
        {
            shift.ToggleActive();
        }

        bool activeBeforeToggle = shift.IsActive;
        ShiftName nameBeforeToggle = shift.Name;
        ShiftIcon iconBeforeToggle = shift.Icon;
        ShiftColor colorBeforeToggle = shift.BackgroundColor;
        ShiftTime startTimeBeforeToggle = shift.StartTime;
        ShiftTime endTimeBeforeToggle = shift.EndTime;
        HoursWorked hoursWorkedBeforeToggle = shift.HoursWorked;
        Guid idBeforeToggle = shift.Id;
        DateTime? syncedAtBeforeToggle = shift.SyncedAt;
        bool isDeletedBeforeToggle = shift.IsDeleted;

        DateTime before = DateTime.UtcNow;

        shift.ToggleActive();

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(shift.IsActive, Is.EqualTo(!activeBeforeToggle), "IsActive flipped");
            Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(shift.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(shift.Id, Is.EqualTo(idBeforeToggle), "Id unchanged");
            Assert.That(shift.Name, Is.EqualTo(nameBeforeToggle), "Name unchanged");
            Assert.That(shift.Icon, Is.EqualTo(iconBeforeToggle), "Icon unchanged");
            Assert.That(shift.BackgroundColor, Is.EqualTo(colorBeforeToggle), "BackgroundColor unchanged");
            Assert.That(shift.StartTime, Is.EqualTo(startTimeBeforeToggle), "StartTime unchanged");
            Assert.That(shift.EndTime, Is.EqualTo(endTimeBeforeToggle), "EndTime unchanged");
            Assert.That(shift.HoursWorked, Is.EqualTo(hoursWorkedBeforeToggle), "HoursWorked unchanged");
            Assert.That(shift.SyncedAt, Is.EqualTo(syncedAtBeforeToggle), "SyncedAt unchanged");
            Assert.That(shift.IsDeleted, Is.EqualTo(isDeletedBeforeToggle), "IsDeleted unchanged");
        });
    }

    /// <summary>
    /// Property 7: For any non-deleted shift, soft delete SHALL set isDeleted = true,
    /// syncedAt = null, modifiedAt >= moment before deletion, without modifying id or content fields.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 5.2</strong>
    /// </remarks>
    /// <param name="input">Valid shift creation input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ShiftArbitraries) })]
    [Category("Property 7: Soft delete sets correct flags")]
    public void SoftDelete_WithAnyNonDeletedShift_SetsCorrectFlags(ShiftCreateInput input)
    {
        Shift shift = Shift.Create(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.StartTime,
            input.EndTime,
            input.HoursWorked,
            input.CreatedAt);

        Guid idBeforeDelete = shift.Id;
        ShiftName nameBeforeDelete = shift.Name;
        ShiftIcon iconBeforeDelete = shift.Icon;
        ShiftColor colorBeforeDelete = shift.BackgroundColor;
        ShiftTime startTimeBeforeDelete = shift.StartTime;
        ShiftTime endTimeBeforeDelete = shift.EndTime;
        HoursWorked hoursWorkedBeforeDelete = shift.HoursWorked;

        DateTime before = DateTime.UtcNow;

        shift.SoftDelete();

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(shift.IsDeleted, Is.True, "IsDeleted set to true");
            Assert.That(shift.SyncedAt, Is.Null, "SyncedAt set to null");
            Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(shift.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(shift.Id, Is.EqualTo(idBeforeDelete), "Id unchanged");
            Assert.That(shift.Name, Is.EqualTo(nameBeforeDelete), "Name unchanged");
            Assert.That(shift.Icon, Is.EqualTo(iconBeforeDelete), "Icon unchanged");
            Assert.That(shift.BackgroundColor, Is.EqualTo(colorBeforeDelete), "BackgroundColor unchanged");
            Assert.That(shift.StartTime, Is.EqualTo(startTimeBeforeDelete), "StartTime unchanged");
            Assert.That(shift.EndTime, Is.EqualTo(endTimeBeforeDelete), "EndTime unchanged");
            Assert.That(shift.HoursWorked, Is.EqualTo(hoursWorkedBeforeDelete), "HoursWorked unchanged");
        });
    }

    /// <summary>
    /// Provides FsCheck arbitrary generators for valid Shift inputs.
    /// </summary>
    public sealed class ShiftArbitraries
    {
        /// <summary>Generates arbitrary valid shift creation inputs.</summary>
        /// <returns>An arbitrary for <see cref="ShiftCreateInput"/>.</returns>
        public static Arbitrary<ShiftCreateInput> Generate()
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

            Gen<ShiftCreateInput> gen =
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
                select new ShiftCreateInput(
                    Guid.NewGuid(),
                    Guid.NewGuid().ToString(),
                    ShiftName.Create(firstChar + new string(remainingChars)),
                    ShiftIcon.Create(ValidEmojis[emojiIndex]),
                    ShiftColor.Create(PaletteColors[colorIndex]),
                    ShiftTime.Create(startHours, startMinutes),
                    ShiftTime.Create(endHours, endMinutes),
                    HoursWorked.Create(hoursWorkedMinutes),
                    DateTime.UtcNow);

            return gen.ToArbitrary();
        }

        /// <summary>Generates arbitrary valid shift update inputs.</summary>
        /// <returns>An arbitrary for <see cref="ShiftUpdateInput"/>.</returns>
        public static Arbitrary<ShiftUpdateInput> Generate2()
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

            Gen<ShiftUpdateInput> gen =
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
                select new ShiftUpdateInput(
                    ShiftName.Create(firstChar + new string(remainingChars)),
                    ShiftIcon.Create(ValidEmojis[emojiIndex]),
                    ShiftColor.Create(PaletteColors[colorIndex]),
                    ShiftTime.Create(startHours, startMinutes),
                    ShiftTime.Create(endHours, endMinutes),
                    HoursWorked.Create(hoursWorkedMinutes));

            return gen.ToArbitrary();
        }
    }

    /// <summary>
    /// Input record for shift creation property tests.
    /// </summary>
#pragma warning disable SA1313 // Parameter names should begin with lower-case letter
    public record ShiftCreateInput(
        Guid Id,
        string UserId,
        ShiftName Name,
        ShiftIcon Icon,
        ShiftColor BackgroundColor,
        ShiftTime StartTime,
        ShiftTime EndTime,
        HoursWorked HoursWorked,
        DateTime CreatedAt);

    /// <summary>
    /// Input record for shift update property tests.
    /// </summary>
    public record ShiftUpdateInput(
        ShiftName Name,
        ShiftIcon Icon,
        ShiftColor BackgroundColor,
        ShiftTime StartTime,
        ShiftTime EndTime,
        HoursWorked HoursWorked);
#pragma warning restore SA1313 // Parameter names should begin with lower-case letter
}
