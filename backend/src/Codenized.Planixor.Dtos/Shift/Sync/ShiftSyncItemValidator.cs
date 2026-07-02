// <copyright file="ShiftSyncItemValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Shift.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates individual shift sync items within a push request payload.
/// </summary>
public sealed class ShiftSyncItemValidator : ValidatorBase<ShiftSyncItem>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftSyncItemValidator"/> class.
    /// </summary>
    /// <param name="service">The validation service used to register rules and execute validation.</param>
    public ShiftSyncItemValidator(IValidationService<ShiftSyncItem> service)
        : base(service)
    {
        this.AddRuleFor<Guid>(x => x.Id)
            .AddRequirement(x => x.Id != Guid.Empty, "Id is required.");

        this.AddRuleFor<string>(x => x.Name)
            .AddRequirement(x => !string.IsNullOrWhiteSpace(x.Name), "Name is required.")
            .AddRequirement(x => x.Name.Trim().Length >= 1 && x.Name.Trim().Length <= 50, "Name must be between 1 and 50 characters.");

        this.AddRuleFor<string>(x => x.Icon)
            .AddRequirement(x => !string.IsNullOrEmpty(x.Icon), "Icon is required.");

        this.AddRuleFor<string>(x => x.BackgroundColor)
            .AddRequirement(x => !string.IsNullOrEmpty(x.BackgroundColor), "BackgroundColor is required.");

        this.AddRuleFor<int>(x => x.StartTime)
            .AddRequirement(x => x.StartTime >= 0 && x.StartTime <= 1439, "StartTime must be between 0 and 1439.");

        this.AddRuleFor<int>(x => x.EndTime)
            .AddRequirement(x => x.EndTime >= 0 && x.EndTime <= 1439, "EndTime must be between 0 and 1439.");

        this.AddRuleFor<int>(x => x.HoursWorked)
            .AddRequirement(x => x.HoursWorked >= 0 && x.HoursWorked <= 1440, "HoursWorked must be between 0 and 1440.");
    }
}
