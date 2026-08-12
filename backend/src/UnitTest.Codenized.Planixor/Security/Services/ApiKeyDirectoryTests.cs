// <copyright file="ApiKeyDirectoryTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Security.Services;

using global::Codenized.Planixor.Core.Settings;
using global::Codenized.Planixor.Services.Security;
using Microsoft.Extensions.Options;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ApiKeyDirectory"/>.
/// </summary>
[TestFixture]
public sealed class ApiKeyDirectoryTests
{
    /// <summary>Verifies that a configured key resolves to the user that owns it.</summary>
    [Test]
    public void TryResolveUser_WithConfiguredKey_ResolvesOwningUser()
    {
        ApiKeyDirectory directory = CreateDirectory(("testuser", "valid-api-key-123"));

        bool result = directory.TryResolveUser("valid-api-key-123", out string username);

        Assert.That(result, Is.True);
        Assert.That(username, Is.EqualTo("testuser"));
    }

    /// <summary>Verifies that each of several configured keys resolves to its own user.</summary>
    [Test]
    public void TryResolveUser_WithSeveralEntries_ResolvesEachToItsOwnUser()
    {
        ApiKeyDirectory directory = CreateDirectory(
            ("admin", "admin-key-abc"),
            ("testuser", "test-key-xyz"),
            ("reporting", "reporting-key-789"));

        directory.TryResolveUser("admin-key-abc", out string admin);
        directory.TryResolveUser("test-key-xyz", out string testuser);
        directory.TryResolveUser("reporting-key-789", out string reporting);

        Assert.That(admin, Is.EqualTo("admin"));
        Assert.That(testuser, Is.EqualTo("testuser"));
        Assert.That(reporting, Is.EqualTo("reporting"));
    }

    /// <summary>Verifies that an unknown key does not resolve and yields an empty username.</summary>
    [Test]
    public void TryResolveUser_WithUnknownKey_DoesNotResolve()
    {
        ApiKeyDirectory directory = CreateDirectory(("testuser", "valid-api-key-123"));

        bool result = directory.TryResolveUser("wrong-key-456", out string username);

        Assert.That(result, Is.False);
        Assert.That(username, Is.Empty);
    }

    /// <summary>Verifies that a null or empty key is rejected without touching the lookup.</summary>
    /// <param name="apiKey">The null or empty API key under test.</param>
    [TestCase(null)]
    [TestCase("")]
    public void TryResolveUser_WithNullOrEmptyKey_DoesNotResolve(string? apiKey)
    {
        ApiKeyDirectory directory = CreateDirectory(("testuser", "valid-api-key-123"));

        bool result = directory.TryResolveUser(apiKey, out string username);

        Assert.That(result, Is.False);
        Assert.That(username, Is.Empty);
    }

    /// <summary>Verifies that key matching is case-sensitive.</summary>
    [Test]
    public void TryResolveUser_WithDifferentCase_DoesNotResolve()
    {
        ApiKeyDirectory directory = CreateDirectory(("testuser", "CaseSensitiveKey123"));

        bool result = directory.TryResolveUser("casesensitivekey123", out _);

        Assert.That(result, Is.False);
    }

    /// <summary>
    /// Verifies that an entry with a blank key is skipped, so a caller presenting an empty or whitespace key can
    /// never authenticate as that user.
    /// </summary>
    /// <param name="configuredKey">The blank key configured for the user.</param>
    [TestCase("")]
    [TestCase("   ")]
    public void TryResolveUser_WithBlankConfiguredKey_SkipsTheEntry(string configuredKey)
    {
        ApiKeyDirectory directory = CreateDirectory(("ghost", configuredKey));

        bool result = directory.TryResolveUser(configuredKey, out string username);

        Assert.That(result, Is.False);
        Assert.That(username, Is.Empty);
    }

    /// <summary>Verifies that an empty configuration resolves nothing rather than throwing.</summary>
    [Test]
    public void TryResolveUser_WithNoConfiguredKeys_DoesNotResolve()
    {
        ApiKeyDirectory directory = CreateDirectory();

        bool result = directory.TryResolveUser("any-key", out string username);

        Assert.That(result, Is.False);
        Assert.That(username, Is.Empty);
    }

    /// <summary>Verifies that a null options argument is rejected.</summary>
    [Test]
    public void Constructor_WithNullOptions_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => new ApiKeyDirectory(null!));
    }

    private static ApiKeyDirectory CreateDirectory(params (string Username, string ApiKey)[] entries)
    {
        var settings = new SecuritySettings
        {
            ApiKeys = entries.ToDictionary(e => e.Username, e => e.ApiKey),
        };

        IOptions<SecuritySettings> options = Options.Create(settings);
        return new ApiKeyDirectory(options);
    }
}
