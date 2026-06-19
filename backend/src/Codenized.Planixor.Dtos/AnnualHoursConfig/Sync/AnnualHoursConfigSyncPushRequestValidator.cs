// <copyright file="AnnualHoursConfigSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the annual hours config sync push request payload.
/// </summary>
public sealed class AnnualHoursConfigSyncPushRequestValidator : ValidatorBase<AnnualHoursConfigSyncPushRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPushRequestValidator"/> class.
    /// </summary>
    /// <param name="service">The validation service used to register rules and execute validation.</param>
    /// <param name="itemValidator">The validator for individual annual hours config sync records.</param>
    public AnnualHoursConfigSyncPushRequestValidator(
        IValidationService<AnnualHoursConfigSyncPushRequest> service,
        IValidator<AnnualHoursConfigSyncRecord> itemValidator)
        : base(service)
    {
        this.AddRuleFor<List<AnnualHoursConfigSyncRecord>>(x => x.Records)
            .AddRequirement(x => x.Records != null && x.Records.Count > 0, "Records collection must contain at least one item.")
            .AddRequirement(x => x.Records != null && x.Records.Count <= 100, "Batch size exceeds maximum of 100.");

        this.SetValidatorFor(Array.Empty<AnnualHoursConfigSyncRecord>(), itemValidator);
    }
}
