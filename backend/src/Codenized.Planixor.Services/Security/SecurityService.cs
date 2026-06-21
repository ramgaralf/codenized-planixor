// <copyright file="SecurityService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Services.Security;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Core.Settings;
using Microsoft.Extensions.Options;

/// <summary>
/// Validates API keys against configured security settings and stores the authenticated username.
/// </summary>
public sealed class SecurityService : ISecurityService, IAppServiceScoped
{
    private readonly SecuritySettings settings;
    private string? authenticatedUsername;

    /// <summary>
    /// Initializes a new instance of the <see cref="SecurityService"/> class.
    /// </summary>
    /// <param name="options">The security settings options.</param>
    public SecurityService(IOptions<SecuritySettings> options)
    {
        this.settings = options.Value;
    }

    /// <inheritdoc/>
    public bool ValidateAPIKey(string apiKey)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            return false;
        }

        foreach (KeyValuePair<string, string> entry in this.settings.ApiKeys)
        {
            if (string.Equals(entry.Value, apiKey, StringComparison.Ordinal))
            {
                this.authenticatedUsername = entry.Key;
                return true;
            }
        }

        return false;
    }

    /// <inheritdoc/>
    public string? GetAuthenticatedUsername()
    {
        return this.authenticatedUsername;
    }
}
