// <copyright file="ShiftSyncPushRequestValidatorTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Validators;

using global::Codenized.CleanArchitecture.Abstractions.Validations;
using global::Codenized.Planixor.Dtos.Shift.Sync;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftSyncPushRequestValidator"/>.
/// </summary>
[TestFixture]
public sealed class ShiftSyncPushRequestValidatorTests
{
    private ShiftSyncPushRequestValidator validator = null!;

    /// <summary>
    /// Sets up the validator for each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        var itemService = new ValidationService<ShiftSyncItem>();
        var itemValidator = new ShiftSyncItemValidator(itemService);
        var pushService = new ValidationService<ShiftSyncPushRequest>();
        this.validator = new ShiftSyncPushRequestValidator(pushService, itemValidator);
    }

    /// <summary>Verifies validation passes with a valid request containing one shift.</summary>
    [Test]
    public void Validate_WithValidSingleShift_HasNoFailures()
    {
        ShiftSyncPushRequest request = CreateValidRequest(1);

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation passes with exactly 100 shifts.</summary>
    [Test]
    public void Validate_WithExactly100Shifts_HasNoFailures()
    {
        ShiftSyncPushRequest request = CreateValidRequest(100);

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation fails when batch exceeds 100 shifts.</summary>
    [Test]
    public void Validate_With101Shifts_HasFailure()
    {
        ShiftSyncPushRequest request = CreateValidRequest(101);

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("maximum of 100")),
            Is.True);
    }

    /// <summary>Verifies validation fails when shifts list is empty.</summary>
    [Test]
    public void Validate_WithEmptyShiftsList_HasFailure()
    {
        var request = new ShiftSyncPushRequest(new List<ShiftSyncItem>());

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("at least one item")),
            Is.True);
    }

    private static ShiftSyncPushRequest CreateValidRequest(int count)
    {
        List<ShiftSyncItem> shifts = Enumerable.Range(0, count)
            .Select(_ => new ShiftSyncItem(
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
                false))
            .ToList();

        return new ShiftSyncPushRequest(shifts);
    }
}
