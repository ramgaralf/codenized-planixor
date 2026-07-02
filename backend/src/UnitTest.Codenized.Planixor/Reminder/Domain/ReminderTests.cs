// <copyright file="ReminderTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="Reminder"/> entity.
/// </summary>
[TestFixture]
public sealed class ReminderTests
{
    /// <summary>Verifies Create sets Id to the provided value.</summary>
    [Test]
    public void Create_WithValidFields_SetsIdToProvidedValue()
    {
        Guid id = Guid.NewGuid();
        Reminder reminder = CreateValidReminder(id);

        Assert.That(reminder.Id, Is.EqualTo(id));
    }

    /// <summary>Verifies Create sets UserId correctly.</summary>
    [Test]
    public void Create_WithValidFields_SetsUserId()
    {
        string userId = "testuser";
        Reminder reminder = CreateValidReminder(userId: userId);

        Assert.That(reminder.UserId, Is.EqualTo(userId));
    }

    /// <summary>Verifies Create sets IsActive to true.</summary>
    [Test]
    public void Create_WithValidFields_SetsIsActiveToTrue()
    {
        Reminder reminder = CreateValidReminder();

        Assert.That(reminder.IsActive, Is.True);
    }

    /// <summary>Verifies Create sets SyncedAt to null.</summary>
    [Test]
    public void Create_WithValidFields_SetsSyncedAtToNull()
    {
        Reminder reminder = CreateValidReminder();

        Assert.That(reminder.SyncedAt, Is.Null);
    }

    /// <summary>Verifies Create sets IsDeleted to false.</summary>
    [Test]
    public void Create_WithValidFields_SetsIsDeletedToFalse()
    {
        Reminder reminder = CreateValidReminder();

        Assert.That(reminder.IsDeleted, Is.False);
    }

    /// <summary>Verifies Create sets ModifiedAt to approximately now (UTC).</summary>
    [Test]
    public void Create_WithValidFields_SetsModifiedAtToUtcNow()
    {
        DateTime before = DateTime.UtcNow;

        Reminder reminder = CreateValidReminder();

        Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before));
        Assert.That(reminder.ModifiedAt, Is.LessThanOrEqualTo(DateTime.UtcNow));
    }

    /// <summary>Verifies Create preserves all user-provided field values.</summary>
    [Test]
    public void Create_WithValidFields_PreservesUserProvidedValues()
    {
        ReminderName name = ReminderName.Create("Take medicine");
        ReminderIcon icon = ReminderIcon.Create("\U0001F48A");
        ReminderColor color = ReminderColor.Create("#EF4444");
        DateTime createdAt = DateTime.UtcNow;

        Reminder reminder = Reminder.Create(
            Guid.NewGuid(),
            "testuser",
            name,
            icon,
            color,
            createdAt);

        Assert.Multiple(() =>
        {
            Assert.That(reminder.Name, Is.EqualTo(name));
            Assert.That(reminder.Icon, Is.EqualTo(icon));
            Assert.That(reminder.BackgroundColor, Is.EqualTo(color));
            Assert.That(reminder.CreatedAt, Is.EqualTo(createdAt));
        });
    }

    /// <summary>Verifies Update preserves Id.</summary>
    [Test]
    public void Update_WithNewValues_PreservesId()
    {
        Guid id = Guid.NewGuid();
        Reminder reminder = CreateValidReminder(id);

        reminder.Update(
            ReminderName.Create("Updated"),
            ReminderIcon.Create("\u2600"),
            ReminderColor.Create("#2563EB"));

        Assert.That(reminder.Id, Is.EqualTo(id));
    }

    /// <summary>Verifies Update preserves SyncedAt.</summary>
    [Test]
    public void Update_WithNewValues_PreservesSyncedAt()
    {
        Reminder reminder = CreateValidReminder();

        reminder.Update(
            ReminderName.Create("Updated"),
            ReminderIcon.Create("\u2600"),
            ReminderColor.Create("#2563EB"));

        Assert.That(reminder.SyncedAt, Is.Null);
    }

    /// <summary>Verifies Update preserves IsDeleted.</summary>
    [Test]
    public void Update_WithNewValues_PreservesIsDeleted()
    {
        Reminder reminder = CreateValidReminder();

        reminder.Update(
            ReminderName.Create("Updated"),
            ReminderIcon.Create("\u2600"),
            ReminderColor.Create("#2563EB"));

        Assert.That(reminder.IsDeleted, Is.False);
    }

    /// <summary>Verifies Update sets ModifiedAt to UTC now.</summary>
    [Test]
    public void Update_WithNewValues_SetsModifiedAtToUtcNow()
    {
        Reminder reminder = CreateValidReminder();
        DateTime before = DateTime.UtcNow;

        reminder.Update(
            ReminderName.Create("Updated"),
            ReminderIcon.Create("\u2600"),
            ReminderColor.Create("#2563EB"));

        Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    /// <summary>Verifies Update persists new field values.</summary>
    [Test]
    public void Update_WithNewValues_PersistsNewFieldValues()
    {
        Reminder reminder = CreateValidReminder();
        ReminderName newName = ReminderName.Create("Afternoon pill");
        ReminderIcon newIcon = ReminderIcon.Create("\u2600");
        ReminderColor newColor = ReminderColor.Create("#2563EB");

        reminder.Update(newName, newIcon, newColor);

        Assert.Multiple(() =>
        {
            Assert.That(reminder.Name, Is.EqualTo(newName));
            Assert.That(reminder.Icon, Is.EqualTo(newIcon));
            Assert.That(reminder.BackgroundColor, Is.EqualTo(newColor));
        });
    }

    /// <summary>Verifies Deactivate sets IsActive to false.</summary>
    [Test]
    public void Deactivate_WhenActive_SetsIsActiveToFalse()
    {
        Reminder reminder = CreateValidReminder();

        reminder.Deactivate();

        Assert.That(reminder.IsActive, Is.False);
    }

    /// <summary>Verifies Deactivate updates ModifiedAt.</summary>
    [Test]
    public void Deactivate_WhenCalled_UpdatesModifiedAt()
    {
        Reminder reminder = CreateValidReminder();
        DateTime before = DateTime.UtcNow;

        reminder.Deactivate();

        Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    /// <summary>Verifies Activate sets IsActive to true.</summary>
    [Test]
    public void Activate_WhenInactive_SetsIsActiveToTrue()
    {
        Reminder reminder = CreateValidReminder();
        reminder.Deactivate();

        reminder.Activate();

        Assert.That(reminder.IsActive, Is.True);
    }

    /// <summary>Verifies Activate updates ModifiedAt.</summary>
    [Test]
    public void Activate_WhenCalled_UpdatesModifiedAt()
    {
        Reminder reminder = CreateValidReminder();
        reminder.Deactivate();
        DateTime before = DateTime.UtcNow;

        reminder.Activate();

        Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    /// <summary>Verifies SoftDelete sets IsDeleted to true.</summary>
    [Test]
    public void SoftDelete_WhenCalled_SetsIsDeletedToTrue()
    {
        Reminder reminder = CreateValidReminder();

        reminder.SoftDelete();

        Assert.That(reminder.IsDeleted, Is.True);
    }

    /// <summary>Verifies SoftDelete sets SyncedAt to null.</summary>
    [Test]
    public void SoftDelete_WhenCalled_SetsSyncedAtToNull()
    {
        Reminder reminder = CreateValidReminder();

        reminder.SoftDelete();

        Assert.That(reminder.SyncedAt, Is.Null);
    }

    /// <summary>Verifies SoftDelete updates ModifiedAt.</summary>
    [Test]
    public void SoftDelete_WhenCalled_UpdatesModifiedAt()
    {
        Reminder reminder = CreateValidReminder();
        DateTime before = DateTime.UtcNow;

        reminder.SoftDelete();

        Assert.That(reminder.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    private static Reminder CreateValidReminder(Guid? id = null, string? userId = null)
    {
        return Reminder.Create(
            id ?? Guid.NewGuid(),
            userId ?? "testuser",
            ReminderName.Create("Take medicine"),
            ReminderIcon.Create("\U0001F48A"),
            ReminderColor.Create("#EF4444"),
            DateTime.UtcNow);
    }
}
