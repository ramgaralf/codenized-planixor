// <copyright file="SecurityService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Services.Security;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Core.Services.Security;

/// <summary>
/// Validates API keys against the configured directory and stores the authenticated username.
/// </summary>
public sealed class SecurityService : ISecurityService, IAppServiceScoped
{
    private readonly IApiKeyDirectory apiKeyDirectory;
    private string? authenticatedUsername;

    /// <summary>
    /// Initializes a new instance of the <see cref="SecurityService"/> class.
    /// </summary>
    /// <param name="apiKeyDirectory">The directory that resolves an API key to its owner.</param>
    public SecurityService(IApiKeyDirectory apiKeyDirectory)
    {
        this.apiKeyDirectory = apiKeyDirectory;
    }

    /// <inheritdoc/>
    public bool ValidateAPIKey(string apiKey)
    {
        if (!this.apiKeyDirectory.TryResolveUser(apiKey, out string username))
        {
            return false;
        }

        this.authenticatedUsername = username;
        return true;
    }

    /// <inheritdoc/>
    public string? GetAuthenticatedUsername()
    {
        return this.authenticatedUsername;
    }
}
