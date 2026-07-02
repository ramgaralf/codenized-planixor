// <copyright file="AnnualHoursConfigSyncPushResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

/// <summary>
/// Response payload for an annual hours config sync push operation.
/// </summary>
/// <param name="ProcessedCount">The number of records successfully processed.</param>
public record AnnualHoursConfigSyncPushResponse(int ProcessedCount);
