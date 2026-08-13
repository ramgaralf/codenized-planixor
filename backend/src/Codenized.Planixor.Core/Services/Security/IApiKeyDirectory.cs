// <copyright file="IApiKeyDirectory.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Services.Security;

/// <summary>
/// Provides a lookup from API key to the user that owns it.
/// </summary>
/// <remarks>
/// Implementations are expected to build the lookup once and answer in constant time, so that the cost of resolving
/// a key does not depend on how many keys are configured or on the position of the matching entry.
/// </remarks>
public interface IApiKeyDirectory
{
    /// <summary>
    /// Resolves the user that owns the supplied API key.
    /// </summary>
    /// <param name="apiKey">The API key presented by the caller.</param>
    /// <param name="username">The resolved username when the method returns <see langword="true"/>; otherwise an empty string.</param>
    /// <returns><see langword="true"/> when the key matches a configured entry; otherwise <see langword="false"/>.</returns>
    bool TryResolveUser(string? apiKey, out string username);
}
