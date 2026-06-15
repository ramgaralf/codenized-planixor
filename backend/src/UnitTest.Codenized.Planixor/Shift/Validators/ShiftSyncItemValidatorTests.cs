// <copyright file="ShiftSyncItemValidatorTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Validators;

using global::Codenized.CleanArchitecture.Abstractions.Validations;
using global::Codenized.Planixor.Dtos.Shift.Sync;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftSyncItemValidator"/>.
/// </summary>
[TestFixture]
public sealed class ShiftSyncItemValidatorTests
{
    private ShiftSyncItemValidator validator = null!;

    /// <summary>
    /// Sets up the validator for each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        var service = new ValidationService<ShiftSyncItem>();
        this.validator = new ShiftSyncItemValidator(service);
    }

    /// <summary>Verifies validation passes for a valid shift item.</summary>
    [Test]
    public void Validate_WithValidItem_HasNoFailures()
    {
        ShiftSyncItem item = CreateValidItem();

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation fails when Id is empty.</summary>
    [Test]
    public void Validate_WithEmptyId_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { Id = Guid.Empty };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("Id is required")),
            Is.True);
    }

    /// <summary>Verifies validation fails when Name is empty.</summary>
    [Test]
    public void Validate_WithEmptyName_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { Name = string.Empty };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("Name is required")),
            Is.True);
    }

    /// <summary>Verifies validation fails when Name is whitespace-only.</summary>
    [Test]
    public void Validate_WithWhitespaceName_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { Name = "   " };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("Name is required")),
            Is.True);
    }

    /// <summary>Verifies validation fails when Name exceeds 50 characters.</summary>
    [Test]
    public void Validate_WithNameExceeding50Characters_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { Name = new string('A', 51) };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("between 1 and 50")),
            Is.True);
    }

    /// <summary>Verifies validation passes with exactly 50 character Name.</summary>
    [Test]
    public void Validate_WithNameExactly50Characters_HasNoFailures()
    {
        ShiftSyncItem item = CreateValidItem() with { Name = new string('A', 50) };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation fails when Icon is empty.</summary>
    [Test]
    public void Validate_WithEmptyIcon_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { Icon = string.Empty };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("Icon is required")),
            Is.True);
    }

    /// <summary>Verifies validation fails when BackgroundColor is empty.</summary>
    [Test]
    public void Validate_WithEmptyBackgroundColor_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { BackgroundColor = string.Empty };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("BackgroundColor is required")),
            Is.True);
    }

    /// <summary>Verifies validation fails when StartTime is negative.</summary>
    [Test]
    public void Validate_WithNegativeStartTime_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { StartTime = -1 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("StartTime must be between 0 and 1439")),
            Is.True);
    }

    /// <summary>Verifies validation fails when StartTime exceeds 1439.</summary>
    [Test]
    public void Validate_WithStartTimeExceeding1439_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { StartTime = 1440 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("StartTime must be between 0 and 1439")),
            Is.True);
    }

    /// <summary>Verifies validation fails when EndTime is negative.</summary>
    [Test]
    public void Validate_WithNegativeEndTime_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { EndTime = -1 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("EndTime must be between 0 and 1439")),
            Is.True);
    }

    /// <summary>Verifies validation fails when EndTime exceeds 1439.</summary>
    [Test]
    public void Validate_WithEndTimeExceeding1439_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { EndTime = 1440 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("EndTime must be between 0 and 1439")),
            Is.True);
    }

    /// <summary>Verifies validation fails when HoursWorked is zero.</summary>
    [Test]
    public void Validate_WithZeroHoursWorked_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { HoursWorked = 0 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("HoursWorked must be between 1 and 1440")),
            Is.True);
    }

    /// <summary>Verifies validation fails when HoursWorked exceeds 1440.</summary>
    [Test]
    public void Validate_WithHoursWorkedExceeding1440_HasFailure()
    {
        ShiftSyncItem item = CreateValidItem() with { HoursWorked = 1441 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("HoursWorked must be between 1 and 1440")),
            Is.True);
    }

    /// <summary>Verifies validation passes with boundary value HoursWorked of 1.</summary>
    [Test]
    public void Validate_WithHoursWorkedOfOne_HasNoFailures()
    {
        ShiftSyncItem item = CreateValidItem() with { HoursWorked = 1 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation passes with boundary value HoursWorked of 1440.</summary>
    [Test]
    public void Validate_WithHoursWorkedOf1440_HasNoFailures()
    {
        ShiftSyncItem item = CreateValidItem() with { HoursWorked = 1440 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation passes with boundary StartTime of 0.</summary>
    [Test]
    public void Validate_WithStartTimeOfZero_HasNoFailures()
    {
        ShiftSyncItem item = CreateValidItem() with { StartTime = 0 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation passes with boundary StartTime of 1439.</summary>
    [Test]
    public void Validate_WithStartTimeOf1439_HasNoFailures()
    {
        ShiftSyncItem item = CreateValidItem() with { StartTime = 1439 };

        this.validator.Validate(item);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    private static ShiftSyncItem CreateValidItem()
    {
        return new ShiftSyncItem(
            Guid.NewGuid(),
            "Morning Shift",
            "☀️",
            "#EF4444",
            480,
            960,
            480,
            true,
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow,
            false);
    }
}
