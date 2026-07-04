// <copyright file="ShiftModeSettingSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.ShiftModeSetting.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the shift mode setting sync push request payload.
/// </summary>
public sealed class ShiftModeSettingSyncPushRequestValidator : ValidatorBase<ShiftModeSettingSyncPushRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftModeSettingSyncPushRequestValidator"/> class.
    /// </summary>
    /// <param name="service">The validation service used to register rules and execute validation.</param>
    public ShiftModeSettingSyncPushRequestValidator(IValidationService<ShiftModeSettingSyncPushRequest> service)
        : base(service)
    {
        this.AddRuleFor<List<ShiftModeSettingSyncRecord>>(x => x.Records)
            .AddRequirement(x => x.Records != null && x.Records.Count <= 1, "Records collection must contain at most one item (single-row entity).");
    }
}
