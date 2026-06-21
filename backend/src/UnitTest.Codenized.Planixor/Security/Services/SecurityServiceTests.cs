// <copyright file="SecurityServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Security.Services;

using global::Codenized.Planixor.Core.Settings;
using global::Codenized.Planixor.Services.Security;
using Microsoft.Extensions.Options;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="SecurityService"/>.
/// </summary>
[TestFixture]
public sealed class SecurityServiceTests
{
    /// <summary>
    /// ValidateAPIKey with a valid key returns true.
    /// </summary>
    [Test]
    public void ValidateAPIKey_WithValidKey_ReturnsTrue()
    {
        // Arrange
        SecuritySettings settings = new SecuritySettings
        {
            ApiKeys = new Dictionary<string, string>
            {
                { "testuser", "valid-api-key-123" },
            },
        };
        IOptions<SecuritySettings> options = Options.Create(settings);
        SecurityService service = new SecurityService(options);

        // Act
        bool result = service.ValidateAPIKey("valid-api-key-123");

        // Assert
        Assert.That(result, Is.True);
    }

    /// <summary>
    /// ValidateAPIKey with an invalid key returns false.
    /// </summary>
    [Test]
    public void ValidateAPIKey_WithInvalidKey_ReturnsFalse()
    {
        // Arrange
        SecuritySettings settings = new SecuritySettings
        {
            ApiKeys = new Dictionary<string, string>
            {
                { "testuser", "valid-api-key-123" },
            },
        };
        IOptions<SecuritySettings> options = Options.Create(settings);
        SecurityService service = new SecurityService(options);

        // Act
        bool result = service.ValidateAPIKey("wrong-key-456");

        // Assert
        Assert.That(result, Is.False);
    }

    /// <summary>
    /// ValidateAPIKey with null or empty key returns false.
    /// </summary>
    /// <param name="apiKey">The null or empty API key.</param>
    [TestCase(null)]
    [TestCase("")]
    public void ValidateAPIKey_WithNullOrEmpty_ReturnsFalse(string? apiKey)
    {
        // Arrange
        SecuritySettings settings = new SecuritySettings
        {
            ApiKeys = new Dictionary<string, string>
            {
                { "testuser", "valid-api-key-123" },
            },
        };
        IOptions<SecuritySettings> options = Options.Create(settings);
        SecurityService service = new SecurityService(options);

        // Act
        bool result = service.ValidateAPIKey(apiKey!);

        // Assert
        Assert.That(result, Is.False);
    }

    /// <summary>
    /// ValidateAPIKey with a valid key stores the associated username.
    /// </summary>
    [Test]
    public void ValidateAPIKey_WithValidKey_StoresUsername()
    {
        // Arrange
        SecuritySettings settings = new SecuritySettings
        {
            ApiKeys = new Dictionary<string, string>
            {
                { "admin", "admin-key-abc" },
                { "testuser", "test-key-xyz" },
            },
        };
        IOptions<SecuritySettings> options = Options.Create(settings);
        SecurityService service = new SecurityService(options);

        // Act
        service.ValidateAPIKey("test-key-xyz");
        string? username = service.GetAuthenticatedUsername();

        // Assert
        Assert.That(username, Is.EqualTo("testuser"));
    }

    /// <summary>
    /// GetAuthenticatedUsername before any validation returns null.
    /// </summary>
    [Test]
    public void GetAuthenticatedUsername_BeforeValidation_ReturnsNull()
    {
        // Arrange
        SecuritySettings settings = new SecuritySettings
        {
            ApiKeys = new Dictionary<string, string>
            {
                { "testuser", "valid-api-key-123" },
            },
        };
        IOptions<SecuritySettings> options = Options.Create(settings);
        SecurityService service = new SecurityService(options);

        // Act
        string? username = service.GetAuthenticatedUsername();

        // Assert
        Assert.That(username, Is.Null);
    }

    /// <summary>
    /// ValidateAPIKey is case-sensitive and returns false for a different case.
    /// </summary>
    [Test]
    public void ValidateAPIKey_CaseSensitive_ReturnsFalseForDifferentCase()
    {
        // Arrange
        SecuritySettings settings = new SecuritySettings
        {
            ApiKeys = new Dictionary<string, string>
            {
                { "testuser", "CaseSensitiveKey123" },
            },
        };
        IOptions<SecuritySettings> options = Options.Create(settings);
        SecurityService service = new SecurityService(options);

        // Act
        bool result = service.ValidateAPIKey("casesensitivekey123");

        // Assert
        Assert.That(result, Is.False);
    }
}
