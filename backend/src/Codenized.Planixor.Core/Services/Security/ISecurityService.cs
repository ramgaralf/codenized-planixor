// <copyright file="ISecurityService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Services.Security;

/// <summary>
/// Defines the contract for API key validation and authenticated user retrieval.
/// </summary>
public interface ISecurityService
{
    /// <summary>
    /// Validates the provided API key against the configured security settings.
    /// </summary>
    /// <param name="apiKey">The API key to validate.</param>
    /// <returns><see langword="true"/> if the API key is valid; otherwise, <see langword="false"/>.</returns>
    bool ValidateAPIKey(string apiKey);

    /// <summary>
    /// Gets the username of the authenticated user for the current request scope.
    /// </summary>
    /// <returns>The authenticated username, or <see langword="null"/> if no successful validation has occurred.</returns>
    string? GetAuthenticatedUsername();
}
