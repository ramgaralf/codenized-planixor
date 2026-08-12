// <copyright file="ShiftSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Shift.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the shift sync push request payload.
/// </summary>
public sealed class ShiftSyncPushRequestValidator : ValidatorBase<ShiftSyncPushRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftSyncPushRequestValidator"/> class.
    /// </summary>
    /// <param name="itemValidator">The validator for individual shift sync items.</param>
    public ShiftSyncPushRequestValidator(IValidator<ShiftSyncItem> itemValidator)
    {
        this.AddRuleFor<List<ShiftSyncItem>>(x => x.Shifts)
            .AddRequirement(x => x.Shifts != null && x.Shifts.Count > 0, "Shifts collection must contain at least one item.")
            .AddRequirement(x => x.Shifts != null && x.Shifts.Count <= 100, "Batch size exceeds maximum of 100.")
            .AddItemsValidator(x => x.Shifts, itemValidator);
    }
}
