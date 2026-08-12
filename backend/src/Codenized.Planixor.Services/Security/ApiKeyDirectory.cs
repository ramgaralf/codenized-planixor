// <copyright file="ApiKeyDirectory.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Services.Security;

using System.Collections.Frozen;
using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Core.Settings;
using Microsoft.Extensions.Options;

/// <summary>
/// Resolves API keys to usernames through a reverse lookup built once at startup.
/// </summary>
/// <remarks>
/// Registered as a singleton so the lookup is built a single time and can be consulted from outside the request
/// scope — the rate limiter needs to classify a request before authentication has run.
/// <para>
/// The lookup removes the position-dependent timing leak of scanning the configured entries one by one. It is not,
/// however, a constant-time comparison in the cryptographic sense: that would require storing the keys hashed, which
/// is a deliberate trade-off not taken here.
/// </para>
/// </remarks>
public sealed class ApiKeyDirectory : IApiKeyDirectory, IAppServiceSingleton
{
    private readonly FrozenDictionary<string, string> usersByApiKey;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApiKeyDirectory"/> class.
    /// </summary>
    /// <param name="options">The security settings holding the configured username to API key pairs.</param>
    public ApiKeyDirectory(IOptions<SecuritySettings> options)
    {
        ArgumentNullException.ThrowIfNull(options);

        // The configured dictionary is keyed by username; callers present the key, so it is inverted here. A later
        // duplicate key would throw on ToFrozenDictionary, so the last writer wins instead — a repeated key is a
        // configuration mistake, but it must not stop the application from starting.
        Dictionary<string, string> inverted = new (StringComparer.Ordinal);

        foreach (KeyValuePair<string, string> entry in options.Value.ApiKeys)
        {
            if (!string.IsNullOrWhiteSpace(entry.Value))
            {
                inverted[entry.Value] = entry.Key;
            }
        }

        this.usersByApiKey = inverted.ToFrozenDictionary(StringComparer.Ordinal);
    }

    /// <inheritdoc/>
    public bool TryResolveUser(string? apiKey, out string username)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            username = string.Empty;
            return false;
        }

        if (this.usersByApiKey.TryGetValue(apiKey, out string? resolved))
        {
            username = resolved;
            return true;
        }

        username = string.Empty;
        return false;
    }
}
