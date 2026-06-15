// <copyright file="ShiftSyncEndpointsTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Endpoints;

using global::Codenized.CleanArchitecture.Abstractions.Validations;
using global::Codenized.Planixor.Dtos.Shift.Sync;
using NUnit.Framework;

/// <summary>
/// Tests for the shift sync endpoints (POST /api/v1/shifts/sync/push, GET /api/v1/shifts/sync/pull).
/// Validates authentication, authorization, and payload validation behavior.
/// </summary>
[TestFixture]
public sealed class ShiftSyncEndpointsTests
{
    private ShiftSyncPushRequestValidator pushValidator = null!;
    private ShiftSyncItemValidator itemValidator = null!;

    /// <summary>
    /// Sets up validators for each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        var itemService = new ValidationService<ShiftSyncItem>();
        this.itemValidator = new ShiftSyncItemValidator(itemService);
        var pushService = new ValidationService<ShiftSyncPushRequest>();
        this.pushValidator = new ShiftSyncPushRequestValidator(pushService, this.itemValidator);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Authentication (401) — Requires WebApplicationFactory integration test setup
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Verifies that an unauthenticated request to POST /api/v1/shifts/sync/push returns 401 Unauthorized.
    /// The push endpoint uses RequireAuthorization() which rejects unauthenticated requests.
    /// </summary>
    [Test]
    [Ignore("TODO: Requires WebApplicationFactory integration test setup with auth middleware to verify 401 response for unauthenticated push requests.")]
    public void PushEndpoint_WithoutAuthentication_Returns401()
    {
        // Arrange: Send POST request without Authorization header
        // Act: Invoke endpoint
        // Assert: HTTP 401 Unauthorized
        Assert.Fail("Integration test not yet implemented.");
    }

    /// <summary>
    /// Verifies that an unauthenticated request to GET /api/v1/shifts/sync/pull returns 401 Unauthorized.
    /// The pull endpoint uses RequireAuthorization() which rejects unauthenticated requests.
    /// </summary>
    [Test]
    [Ignore("TODO: Requires WebApplicationFactory integration test setup with auth middleware to verify 401 response for unauthenticated pull requests.")]
    public void PullEndpoint_WithoutAuthentication_Returns401()
    {
        // Arrange: Send GET request without Authorization header
        // Act: Invoke endpoint
        // Assert: HTTP 401 Unauthorized
        Assert.Fail("Integration test not yet implemented.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Authorization / Subscription (403) — Requires WebApplicationFactory
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Verifies that an authenticated user without an active subscription receives 403 Forbidden on push.
    /// The push endpoint enforces active subscription check (throws ForbiddenException).
    /// </summary>
    [Test]
    [Ignore("TODO: Requires WebApplicationFactory integration test setup with subscription check middleware to verify 403 response when user has no active subscription.")]
    public void PushEndpoint_WithoutActiveSubscription_Returns403()
    {
        // Arrange: Authenticated user without active subscription
        // Act: POST /api/v1/shifts/sync/push
        // Assert: HTTP 403 Forbidden
        Assert.Fail("Integration test not yet implemented.");
    }

    /// <summary>
    /// Verifies that an authenticated user without an active subscription receives 403 Forbidden on pull.
    /// The pull endpoint enforces active subscription check (throws ForbiddenException).
    /// </summary>
    [Test]
    [Ignore("TODO: Requires WebApplicationFactory integration test setup with subscription check middleware to verify 403 response when user has no active subscription.")]
    public void PullEndpoint_WithoutActiveSubscription_Returns403()
    {
        // Arrange: Authenticated user without active subscription
        // Act: GET /api/v1/shifts/sync/pull
        // Assert: HTTP 403 Forbidden
        Assert.Fail("Integration test not yet implemented.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Invalid payload (400) — Validated through the pipeline's ValidationInteractorBehaviour
    // The ValidationInteractorBehaviour invokes the ShiftSyncItemValidator for each item.
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Verifies that a shift sync item with an empty name is rejected by the validation pipeline.
    /// </summary>
    [Test]
    public void PushEndpoint_WithInvalidPayload_EmptyName_ProducesValidationFailure()
    {
        ShiftSyncItem invalidItem = CreateValidItem() with { Name = string.Empty };

        this.itemValidator.Validate(invalidItem);

        Assert.That(this.itemValidator.Failures, Is.Not.Empty);
        Assert.That(
            this.itemValidator.Failures.Any(f => f.ErrorMessage.Contains("Name is required")),
            Is.True);
    }

    /// <summary>
    /// Verifies that a shift sync item with StartTime out of range is rejected by the validation pipeline.
    /// </summary>
    [Test]
    public void PushEndpoint_WithInvalidPayload_InvalidStartTime_ProducesValidationFailure()
    {
        ShiftSyncItem invalidItem = CreateValidItem() with { StartTime = -1 };

        this.itemValidator.Validate(invalidItem);

        Assert.That(this.itemValidator.Failures, Is.Not.Empty);
        Assert.That(
            this.itemValidator.Failures.Any(f => f.ErrorMessage.Contains("StartTime must be between 0 and 1439")),
            Is.True);
    }

    /// <summary>
    /// Verifies that a shift sync item with HoursWorked of zero is rejected by the validation pipeline.
    /// </summary>
    [Test]
    public void PushEndpoint_WithInvalidPayload_InvalidHoursWorked_ProducesValidationFailure()
    {
        ShiftSyncItem invalidItem = CreateValidItem() with { HoursWorked = 0 };

        this.itemValidator.Validate(invalidItem);

        Assert.That(this.itemValidator.Failures, Is.Not.Empty);
        Assert.That(
            this.itemValidator.Failures.Any(f => f.ErrorMessage.Contains("HoursWorked must be between 1 and 1440")),
            Is.True);
    }

    /// <summary>
    /// Verifies that a shift sync item with an empty Guid Id is rejected by the validation pipeline.
    /// </summary>
    [Test]
    public void PushEndpoint_WithInvalidPayload_EmptyId_ProducesValidationFailure()
    {
        ShiftSyncItem invalidItem = CreateValidItem() with { Id = Guid.Empty };

        this.itemValidator.Validate(invalidItem);

        Assert.That(this.itemValidator.Failures, Is.Not.Empty);
        Assert.That(
            this.itemValidator.Failures.Any(f => f.ErrorMessage.Contains("Id is required")),
            Is.True);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Batch exceeds 100 (400) — Validated through the pipeline's ValidationInteractorBehaviour
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Verifies that a push request with more than 100 shifts is rejected by the validation pipeline.
    /// </summary>
    [Test]
    public void PushEndpoint_WithBatchExceeding100_ProducesValidationFailure()
    {
        List<ShiftSyncItem> shifts = Enumerable.Range(0, 101)
            .Select(_ => CreateValidItem())
            .ToList();
        var request = new ShiftSyncPushRequest(shifts);

        this.pushValidator.Validate(request);

        Assert.That(this.pushValidator.Failures, Is.Not.Empty);
        Assert.That(
            this.pushValidator.Failures.Any(f => f.ErrorMessage.Contains("maximum of 100")),
            Is.True);
    }

    /// <summary>
    /// Verifies that a push request with exactly 100 shifts passes batch size validation.
    /// </summary>
    [Test]
    public void PushEndpoint_WithExactly100Shifts_PassesBatchSizeValidation()
    {
        List<ShiftSyncItem> shifts = Enumerable.Range(0, 100)
            .Select(_ => CreateValidItem())
            .ToList();
        var request = new ShiftSyncPushRequest(shifts);

        this.pushValidator.Validate(request);

        Assert.That(this.pushValidator.Failures, Is.Empty);
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
