// <copyright file="AppSettings.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Settings;

using System.Reflection;

/// <summary>
/// Represents the application configuration settings.
/// </summary>
public sealed class AppSettings
{
    /// <summary>Gets or sets the friendly name.</summary>
    public string Friendly { get; set; } = string.Empty;

    /// <summary>Gets or sets the product name.</summary>
    public string Product { get; set; } = string.Empty;

    /// <summary>Gets or sets the service name.</summary>
    public string Service { get; set; } = string.Empty;

    /// <summary>Gets or sets the version.</summary>
    public string Version { get; set; } = Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "0.0.0";

    /// <summary>Gets or sets the environment name.</summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether Swagger UI is enabled.</summary>
    public bool AllowSwagger { get; set; }

    /// <summary>Gets or sets the base path for API endpoints.</summary>
    public string ApiBasePath { get; set; } = "/api";

    /// <summary>Gets or sets http client timeout in milliseconds.</summary>
    public int HttpClientTimeoutMiliseconds { get; set; } = 5000;
}
