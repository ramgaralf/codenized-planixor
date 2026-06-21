// <copyright file="SecuritySettings.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Settings;

/// <summary>
/// Represents the security configuration settings.
/// </summary>
public sealed class SecuritySettings
{
    /// <summary>Gets or sets the API keys dictionary (username → key).</summary>
    public Dictionary<string, string> ApiKeys { get; set; } = new();
}
