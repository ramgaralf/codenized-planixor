// <copyright file="ShiftModeSettingSyncPushRequestValidatorTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Validators;

using global::Codenized.CleanArchitecture.Abstractions.Validations;
using global::Codenized.Planixor.Dtos.ShiftModeSetting.Sync;
using NUnit.Framework;

/// <summary>
/// Tests for <see cref="ShiftModeSettingSyncPushRequestValidator"/>.
/// </summary>
[TestFixture]
public sealed class ShiftModeSettingSyncPushRequestValidatorTests
{
    private ShiftModeSettingSyncPushRequestValidator validator = null!;

    /// <summary>
    /// Sets up the validator for each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        var service = new ValidationService<ShiftModeSettingSyncPushRequest>();
        this.validator = new ShiftModeSettingSyncPushRequestValidator(service);
    }

    /// <summary>Verifies validation passes with a valid request containing one record.</summary>
    [Test]
    public void Validate_WithOneRecord_HasNoFailures()
    {
        ShiftModeSettingSyncPushRequest request = CreateValidRequest(1);

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation passes with an empty records list (0 records is valid).</summary>
    [Test]
    public void Validate_WithEmptyRecordsList_HasNoFailures()
    {
        var request = new ShiftModeSettingSyncPushRequest(new List<ShiftModeSettingSyncRecord>());

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Empty);
    }

    /// <summary>Verifies validation fails when records list contains more than one item.</summary>
    [Test]
    public void Validate_WithTwoRecords_HasFailure()
    {
        ShiftModeSettingSyncPushRequest request = CreateValidRequest(2);

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("at most one item")),
            Is.True);
    }

    /// <summary>Verifies validation fails when records list contains many items.</summary>
    [Test]
    public void Validate_WithMultipleRecords_HasFailure()
    {
        ShiftModeSettingSyncPushRequest request = CreateValidRequest(5);

        this.validator.Validate(request);

        Assert.That(this.validator.Failures, Is.Not.Empty);
        Assert.That(
            this.validator.Failures.Any(f => f.ErrorMessage.Contains("at most one item")),
            Is.True);
    }

    private static ShiftModeSettingSyncPushRequest CreateValidRequest(int count)
    {
        List<ShiftModeSettingSyncRecord> records = Enumerable.Range(0, count)
            .Select(_ => new ShiftModeSettingSyncRecord(
                Guid.NewGuid(),
                true,
                DateTime.UtcNow,
                false))
            .ToList();

        return new ShiftModeSettingSyncPushRequest(records);
    }
}
