// <copyright file="ShiftTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="Shift"/> entity.
/// </summary>
[TestFixture]
public sealed class ShiftTests
{
    /// <summary>Verifies Create sets Id to the provided value.</summary>
    [Test]
    public void Create_WithValidFields_SetsIdToProvidedValue()
    {
        Guid id = Guid.NewGuid();
        Shift shift = CreateValidShift(id);

        Assert.That(shift.Id, Is.EqualTo(id));
    }

    /// <summary>Verifies Create sets UserId correctly.</summary>
    [Test]
    public void Create_WithValidFields_SetsUserId()
    {
        Guid userId = Guid.NewGuid();
        Shift shift = CreateValidShift(userId: userId);

        Assert.That(shift.UserId, Is.EqualTo(userId));
    }

    /// <summary>Verifies Create sets IsActive to true.</summary>
    [Test]
    public void Create_WithValidFields_SetsIsActiveToTrue()
    {
        Shift shift = CreateValidShift();

        Assert.That(shift.IsActive, Is.True);
    }

    /// <summary>Verifies Create sets SyncedAt to null.</summary>
    [Test]
    public void Create_WithValidFields_SetsSyncedAtToNull()
    {
        Shift shift = CreateValidShift();

        Assert.That(shift.SyncedAt, Is.Null);
    }

    /// <summary>Verifies Create sets IsDeleted to false.</summary>
    [Test]
    public void Create_WithValidFields_SetsIsDeletedToFalse()
    {
        Shift shift = CreateValidShift();

        Assert.That(shift.IsDeleted, Is.False);
    }

    /// <summary>Verifies Create sets ModifiedAt to approximately now (UTC).</summary>
    [Test]
    public void Create_WithValidFields_SetsModifiedAtToUtcNow()
    {
        DateTime before = DateTime.UtcNow;

        Shift shift = CreateValidShift();

        Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before));
        Assert.That(shift.ModifiedAt, Is.LessThanOrEqualTo(DateTime.UtcNow));
    }

    /// <summary>Verifies Create preserves all user-provided field values.</summary>
    [Test]
    public void Create_WithValidFields_PreservesUserProvidedValues()
    {
        ShiftName name = ShiftName.Create("Morning");
        ShiftIcon icon = ShiftIcon.Create("\U0001F4BC");
        ShiftColor color = ShiftColor.Create("#EF4444");
        ShiftTime startTime = ShiftTime.Create(8, 0);
        ShiftTime endTime = ShiftTime.Create(16, 0);
        HoursWorked hoursWorked = HoursWorked.Create(480);
        DateTime createdAt = DateTime.UtcNow;

        Shift shift = Shift.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            name,
            icon,
            color,
            startTime,
            endTime,
            hoursWorked,
            createdAt);

        Assert.Multiple(() =>
        {
            Assert.That(shift.Name, Is.EqualTo(name));
            Assert.That(shift.Icon, Is.EqualTo(icon));
            Assert.That(shift.BackgroundColor, Is.EqualTo(color));
            Assert.That(shift.StartTime, Is.EqualTo(startTime));
            Assert.That(shift.EndTime, Is.EqualTo(endTime));
            Assert.That(shift.HoursWorked, Is.EqualTo(hoursWorked));
            Assert.That(shift.CreatedAt, Is.EqualTo(createdAt));
        });
    }

    /// <summary>Verifies Update preserves Id.</summary>
    [Test]
    public void Update_WithNewValues_PreservesId()
    {
        Guid id = Guid.NewGuid();
        Shift shift = CreateValidShift(id);

        shift.Update(
            ShiftName.Create("Updated"),
            ShiftIcon.Create("\u2600"),
            ShiftColor.Create("#2563EB"),
            ShiftTime.Create(9, 0),
            ShiftTime.Create(17, 0),
            HoursWorked.Create(480));

        Assert.That(shift.Id, Is.EqualTo(id));
    }

    /// <summary>Verifies Update sets ModifiedAt to UTC now.</summary>
    [Test]
    public void Update_WithNewValues_SetsModifiedAtToUtcNow()
    {
        Shift shift = CreateValidShift();
        DateTime before = DateTime.UtcNow;

        shift.Update(
            ShiftName.Create("Updated"),
            ShiftIcon.Create("\u2600"),
            ShiftColor.Create("#2563EB"),
            ShiftTime.Create(9, 0),
            ShiftTime.Create(17, 0),
            HoursWorked.Create(480));

        Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    /// <summary>Verifies Update persists new field values.</summary>
    [Test]
    public void Update_WithNewValues_PersistsNewFieldValues()
    {
        Shift shift = CreateValidShift();
        ShiftName newName = ShiftName.Create("Afternoon");
        ShiftIcon newIcon = ShiftIcon.Create("\u2600");
        ShiftColor newColor = ShiftColor.Create("#2563EB");
        ShiftTime newStartTime = ShiftTime.Create(14, 0);
        ShiftTime newEndTime = ShiftTime.Create(22, 0);
        HoursWorked newHoursWorked = HoursWorked.Create(480);

        shift.Update(newName, newIcon, newColor, newStartTime, newEndTime, newHoursWorked);

        Assert.Multiple(() =>
        {
            Assert.That(shift.Name, Is.EqualTo(newName));
            Assert.That(shift.Icon, Is.EqualTo(newIcon));
            Assert.That(shift.BackgroundColor, Is.EqualTo(newColor));
            Assert.That(shift.StartTime, Is.EqualTo(newStartTime));
            Assert.That(shift.EndTime, Is.EqualTo(newEndTime));
            Assert.That(shift.HoursWorked, Is.EqualTo(newHoursWorked));
        });
    }

    /// <summary>Verifies SoftDelete sets IsDeleted to true.</summary>
    [Test]
    public void SoftDelete_WhenCalled_SetsIsDeletedToTrue()
    {
        Shift shift = CreateValidShift();

        shift.SoftDelete();

        Assert.That(shift.IsDeleted, Is.True);
    }

    /// <summary>Verifies SoftDelete sets SyncedAt to null.</summary>
    [Test]
    public void SoftDelete_WhenCalled_SetsSyncedAtToNull()
    {
        Shift shift = CreateValidShift();

        shift.SoftDelete();

        Assert.That(shift.SyncedAt, Is.Null);
    }

    /// <summary>Verifies SoftDelete updates ModifiedAt.</summary>
    [Test]
    public void SoftDelete_WhenCalled_UpdatesModifiedAt()
    {
        Shift shift = CreateValidShift();
        DateTime before = DateTime.UtcNow;

        shift.SoftDelete();

        Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    /// <summary>Verifies ToggleActive flips IsActive from true to false.</summary>
    [Test]
    public void ToggleActive_WhenActive_SetsIsActiveToFalse()
    {
        Shift shift = CreateValidShift();

        shift.ToggleActive();

        Assert.That(shift.IsActive, Is.False);
    }

    /// <summary>Verifies ToggleActive flips IsActive from false to true.</summary>
    [Test]
    public void ToggleActive_WhenInactive_SetsIsActiveToTrue()
    {
        Shift shift = CreateValidShift();
        shift.ToggleActive();

        shift.ToggleActive();

        Assert.That(shift.IsActive, Is.True);
    }

    /// <summary>Verifies ToggleActive updates ModifiedAt.</summary>
    [Test]
    public void ToggleActive_WhenCalled_UpdatesModifiedAt()
    {
        Shift shift = CreateValidShift();
        DateTime before = DateTime.UtcNow;

        shift.ToggleActive();

        Assert.That(shift.ModifiedAt, Is.GreaterThanOrEqualTo(before));
    }

    private static Shift CreateValidShift(Guid? id = null, Guid? userId = null)
    {
        return Shift.Create(
            id ?? Guid.NewGuid(),
            userId ?? Guid.NewGuid(),
            ShiftName.Create("Morning Shift"),
            ShiftIcon.Create("\U0001F4BC"),
            ShiftColor.Create("#EF4444"),
            ShiftTime.Create(8, 0),
            ShiftTime.Create(16, 0),
            HoursWorked.Create(480),
            DateTime.UtcNow);
    }
}
