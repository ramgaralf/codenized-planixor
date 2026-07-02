// <copyright file="AnnualHoursConfigSyncRecordValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates individual annual hours config sync records within a push request payload.
/// </summary>
public sealed class AnnualHoursConfigSyncRecordValidator : ValidatorBase<AnnualHoursConfigSyncRecord>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncRecordValidator"/> class.
    /// </summary>
    /// <param name="service">The validation service used to register rules and execute validation.</param>
    public AnnualHoursConfigSyncRecordValidator(IValidationService<AnnualHoursConfigSyncRecord> service)
        : base(service)
    {
        this.AddRuleFor<Guid>(x => x.Id)
            .AddRequirement(x => x.Id != Guid.Empty, "Id is required.");

        this.AddRuleFor<int>(x => x.Year)
            .AddRequirement(x => x.Year >= 2000 && x.Year <= 2100, "Year must be between 2000 and 2100.");

        this.AddRuleFor<int>(x => x.ConfiguredHours)
            .AddRequirement(x => x.ConfiguredHours >= 1 && x.ConfiguredHours <= 8784, "ConfiguredHours must be between 1 and 8784.");
    }
}
