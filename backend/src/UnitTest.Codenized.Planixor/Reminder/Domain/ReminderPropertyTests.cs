// <copyright file="ReminderPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Domain;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Property-based tests for the <see cref="Reminder"/> entity.
/// Validates: Requirements 1.1, 3.2, 4.2, 4.5, 4.7, 5.2.
/// </summary>
[TestFixture]
[Category("Feature: gh5-reminder-management")]
public sealed class ReminderPropertyTests
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
    /// Property 1: For any valid inputs, Create() produces a record where id matches,
    /// isActive=true, syncedAt=null, isDeleted=false, modifiedAt is recent, and all fields are preserved.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.1, 4.7</strong>
    /// </remarks>
    /// <param name="input">Valid reminder creation input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderArbitraries) })]
    [Category("Property 1: Creation produces a valid reminder record")]
    public void Create_WithAnyValidFields_ProducesValidReminderRecord(ReminderCreateInput input)
    {
        DateTime before = DateTime.UtcNow;

        Reminder reminder = Reminder.Create(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.CreatedAt);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(reminder.Id, Is.EqualTo(input.Id), "Id equals provided Id");
            Assert.That(reminder.Id, Is.Not.EqualTo(Guid.Empty), "Id is non-empty");
            Assert.That(reminder.UserId, Is.EqualTo(input.UserId), "UserId preserved");
            Assert.That(reminder.IsActive, Is.True, "IsActive is true");
            Assert.That(reminder.SyncedAt, Is.Null, "SyncedAt is null");
            Assert.That(reminder.IsDeleted, Is.False, "IsDeleted is false");
            Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(reminder.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(reminder.Name, Is.EqualTo(input.Name), "Name preserved");
            Assert.That(reminder.Icon, Is.EqualTo(input.Icon), "Icon preserved");
            Assert.That(reminder.BackgroundColor, Is.EqualTo(input.BackgroundColor), "BackgroundColor preserved");
            Assert.That(reminder.CreatedAt, Is.EqualTo(input.CreatedAt), "CreatedAt preserved");
        });
    }

    /// <summary>
    /// Property 6: For any existing reminder and valid new values, Update() preserves
    /// id/syncedAt/isDeleted, updates modifiedAt, and sets new field values.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 3.2</strong>
    /// </remarks>
    /// <param name="createInput">Input for creating the initial reminder.</param>
    /// <param name="updateInput">Input for updating the reminder.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderArbitraries) })]
    [Category("Property 6: Edit preserves system fields and updates modifiedAt")]
    public void Update_WithAnyValidModifications_PreservesSystemFieldsAndUpdatesModifiedAt(
        ReminderCreateInput createInput,
        ReminderUpdateInput updateInput)
    {
        Reminder reminder = Reminder.Create(
            createInput.Id,
            createInput.UserId,
            createInput.Name,
            createInput.Icon,
            createInput.BackgroundColor,
            createInput.CreatedAt);

        Guid originalId = reminder.Id;
        DateTime? originalSyncedAt = reminder.SyncedAt;
        bool originalIsDeleted = reminder.IsDeleted;

        DateTime before = DateTime.UtcNow;

        reminder.Update(
            updateInput.Name,
            updateInput.Icon,
            updateInput.BackgroundColor);

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(reminder.Id, Is.EqualTo(originalId), "Id preserved");
            Assert.That(reminder.SyncedAt, Is.EqualTo(originalSyncedAt), "SyncedAt preserved");
            Assert.That(reminder.IsDeleted, Is.EqualTo(originalIsDeleted), "IsDeleted preserved");
            Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(reminder.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(reminder.Name, Is.EqualTo(updateInput.Name), "New Name persisted");
            Assert.That(reminder.Icon, Is.EqualTo(updateInput.Icon), "New Icon persisted");
            Assert.That(reminder.BackgroundColor, Is.EqualTo(updateInput.BackgroundColor), "New BackgroundColor persisted");
        });
    }

    /// <summary>
    /// Property 7: For any reminder, Deactivate()/Activate() flips isActive,
    /// updates modifiedAt, and preserves all other fields unchanged.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 4.2, 4.5</strong>
    /// </remarks>
    /// <param name="input">Valid reminder creation input.</param>
    /// <param name="initialActive">Whether the reminder starts active before the toggle.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderArbitraries) })]
    [Category("Property 7: Toggle active state updates isActive and modifiedAt")]
    public void ToggleActive_WithAnyReminder_FlipsIsActiveAndUpdatesModifiedAtOnly(
        ReminderCreateInput input,
        bool initialActive)
    {
        Reminder reminder = Reminder.Create(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.CreatedAt);

        if (!initialActive)
        {
            reminder.Deactivate();
        }

        bool activeBeforeToggle = reminder.IsActive;
        ReminderName nameBeforeToggle = reminder.Name;
        ReminderIcon iconBeforeToggle = reminder.Icon;
        ReminderColor colorBeforeToggle = reminder.BackgroundColor;
        Guid idBeforeToggle = reminder.Id;
        DateTime? syncedAtBeforeToggle = reminder.SyncedAt;
        bool isDeletedBeforeToggle = reminder.IsDeleted;
        DateTime createdAtBeforeToggle = reminder.CreatedAt;

        DateTime before = DateTime.UtcNow;

        if (activeBeforeToggle)
        {
            reminder.Deactivate();
        }
        else
        {
            reminder.Activate();
        }

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(reminder.IsActive, Is.EqualTo(!activeBeforeToggle), "IsActive flipped");
            Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(reminder.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(reminder.Id, Is.EqualTo(idBeforeToggle), "Id unchanged");
            Assert.That(reminder.Name, Is.EqualTo(nameBeforeToggle), "Name unchanged");
            Assert.That(reminder.Icon, Is.EqualTo(iconBeforeToggle), "Icon unchanged");
            Assert.That(reminder.BackgroundColor, Is.EqualTo(colorBeforeToggle), "BackgroundColor unchanged");
            Assert.That(reminder.SyncedAt, Is.EqualTo(syncedAtBeforeToggle), "SyncedAt unchanged");
            Assert.That(reminder.IsDeleted, Is.EqualTo(isDeletedBeforeToggle), "IsDeleted unchanged");
            Assert.That(reminder.CreatedAt, Is.EqualTo(createdAtBeforeToggle), "CreatedAt unchanged");
        });
    }

    /// <summary>
    /// Property 10: For any reminder, SoftDelete() sets isDeleted=true, syncedAt=null,
    /// and modifiedAt updated, without modifying other fields.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 5.2</strong>
    /// </remarks>
    /// <param name="input">Valid reminder creation input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(ReminderArbitraries) })]
    [Category("Property 10: Soft-delete sets correct field values")]
    public void SoftDelete_WithAnyReminder_SetsCorrectFieldValues(ReminderCreateInput input)
    {
        Reminder reminder = Reminder.Create(
            input.Id,
            input.UserId,
            input.Name,
            input.Icon,
            input.BackgroundColor,
            input.CreatedAt);

        Guid idBeforeDelete = reminder.Id;
        ReminderName nameBeforeDelete = reminder.Name;
        ReminderIcon iconBeforeDelete = reminder.Icon;
        ReminderColor colorBeforeDelete = reminder.BackgroundColor;
        DateTime createdAtBeforeDelete = reminder.CreatedAt;
        bool isActiveBeforeDelete = reminder.IsActive;

        DateTime before = DateTime.UtcNow;

        reminder.SoftDelete();

        DateTime after = DateTime.UtcNow;

        Assert.Multiple(() =>
        {
            Assert.That(reminder.IsDeleted, Is.True, "IsDeleted set to true");
            Assert.That(reminder.SyncedAt, Is.Null, "SyncedAt set to null");
            Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before), "ModifiedAt >= before");
            Assert.That(reminder.ModifiedAt, Is.LessThanOrEqualTo(after), "ModifiedAt <= after");
            Assert.That(reminder.Id, Is.EqualTo(idBeforeDelete), "Id unchanged");
            Assert.That(reminder.Name, Is.EqualTo(nameBeforeDelete), "Name unchanged");
            Assert.That(reminder.Icon, Is.EqualTo(iconBeforeDelete), "Icon unchanged");
            Assert.That(reminder.BackgroundColor, Is.EqualTo(colorBeforeDelete), "BackgroundColor unchanged");
            Assert.That(reminder.CreatedAt, Is.EqualTo(createdAtBeforeDelete), "CreatedAt unchanged");
            Assert.That(reminder.IsActive, Is.EqualTo(isActiveBeforeDelete), "IsActive unchanged");
        });
    }

    /// <summary>
    /// Provides FsCheck arbitrary generators for valid Reminder inputs.
    /// </summary>
    public sealed class ReminderArbitraries
    {
        /// <summary>Generates arbitrary valid reminder creation inputs.</summary>
        /// <returns>An arbitrary for <see cref="ReminderCreateInput"/>.</returns>
        public static Arbitrary<ReminderCreateInput> Generate()
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

            Gen<ReminderCreateInput> gen =
                from firstChar in alphanumChar
                from remainingLength in Gen.Choose(0, 49)
                from remainingChars in anyNameChar.ArrayOf(remainingLength)
                from emojiIndex in Gen.Choose(0, ValidEmojis.Length - 1)
                from colorIndex in Gen.Choose(0, PaletteColors.Length - 1)
                select new ReminderCreateInput(
                    Guid.NewGuid(),
                    Guid.NewGuid().ToString(),
                    ReminderName.Create(firstChar + new string(remainingChars)),
                    ReminderIcon.Create(ValidEmojis[emojiIndex]),
                    ReminderColor.Create(PaletteColors[colorIndex]),
                    DateTime.UtcNow);

            return gen.ToArbitrary();
        }

        /// <summary>Generates arbitrary valid reminder update inputs.</summary>
        /// <returns>An arbitrary for <see cref="ReminderUpdateInput"/>.</returns>
        public static Arbitrary<ReminderUpdateInput> Generate2()
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

            Gen<ReminderUpdateInput> gen =
                from firstChar in alphanumChar
                from remainingLength in Gen.Choose(0, 49)
                from remainingChars in anyNameChar.ArrayOf(remainingLength)
                from emojiIndex in Gen.Choose(0, ValidEmojis.Length - 1)
                from colorIndex in Gen.Choose(0, PaletteColors.Length - 1)
                select new ReminderUpdateInput(
                    ReminderName.Create(firstChar + new string(remainingChars)),
                    ReminderIcon.Create(ValidEmojis[emojiIndex]),
                    ReminderColor.Create(PaletteColors[colorIndex]));

            return gen.ToArbitrary();
        }
    }

    /// <summary>
    /// Input record for reminder creation property tests.
    /// </summary>
#pragma warning disable SA1313 // Parameter names should begin with lower-case letter
    public record ReminderCreateInput(
        Guid Id,
        string UserId,
        ReminderName Name,
        ReminderIcon Icon,
        ReminderColor BackgroundColor,
        DateTime CreatedAt);

    /// <summary>
    /// Input record for reminder update property tests.
    /// </summary>
    public record ReminderUpdateInput(
        ReminderName Name,
        ReminderIcon Icon,
        ReminderColor BackgroundColor);
#pragma warning restore SA1313 // Parameter names should begin with lower-case letter
}
