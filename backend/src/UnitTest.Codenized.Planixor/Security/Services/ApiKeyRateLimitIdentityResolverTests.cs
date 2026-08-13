// <copyright file="ApiKeyRateLimitIdentityResolverTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Security.Services;

using global::Codenized.CleanArchitecture.Abstractions;
using global::Codenized.Planixor.Core.Settings;
using global::Codenized.Planixor.Services.Security;
using global::Codenized.Security.RateLimit.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ApiKeyRateLimitIdentityResolver"/>, which tells the rate limiter which configured user
/// a request belongs to.
/// </summary>
[TestFixture]
public sealed class ApiKeyRateLimitIdentityResolverTests
{
    private const string ValidKey = "valid-api-key-123";

    /// <summary>Verifies that a valid bearer key resolves to the user that owns it.</summary>
    [Test]
    public void TryResolveIdentity_WithAValidBearerKey_ResolvesTheOwningUser()
    {
        ApiKeyRateLimitIdentityResolver resolver = CreateResolver();

        bool result = resolver.TryResolveIdentity(ContextWith($"Bearer {ValidKey}"), out string identity);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.True);
            Assert.That(identity, Is.EqualTo("testuser"));
        });
    }

    /// <summary>Verifies that the scheme name is matched without regard to case.</summary>
    [Test]
    public void TryResolveIdentity_WithALowercaseScheme_StillResolves()
    {
        ApiKeyRateLimitIdentityResolver resolver = CreateResolver();

        bool result = resolver.TryResolveIdentity(ContextWith($"bearer {ValidKey}"), out _);

        Assert.That(result, Is.True);
    }

    /// <summary>
    /// Verifies that anything that is not a valid key resolves to nothing, so the request falls into the anonymous
    /// bucket for its source address.
    /// </summary>
    /// <remarks>
    /// This is the case that makes brute force impractical, and it is the one worth being sure of: a resolver that
    /// returned <see langword="true"/> for a wrong key would give every guess its own generous bucket.
    /// </remarks>
    /// <param name="header">The Authorization header presented.</param>
    [TestCase("")]
    [TestCase("Bearer ")]
    [TestCase("Bearer wrong-key")]
    [TestCase("Basic dXNlcjpwYXNz")]
    [TestCase("valid-api-key-123")]
    public void TryResolveIdentity_WithoutAValidKey_ResolvesNothing(string header)
    {
        ApiKeyRateLimitIdentityResolver resolver = CreateResolver();

        bool result = resolver.TryResolveIdentity(ContextWith(header), out string identity);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.False);
            Assert.That(identity, Is.Empty);
        });
    }

    /// <summary>Verifies that surrounding whitespace in the header does not stop a valid key from resolving.</summary>
    [Test]
    public void TryResolveIdentity_WithPaddedKey_StillResolves()
    {
        ApiKeyRateLimitIdentityResolver resolver = CreateResolver();

        bool result = resolver.TryResolveIdentity(ContextWith($"Bearer   {ValidKey}  "), out string identity);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.True);
            Assert.That(identity, Is.EqualTo("testuser"));
        });
    }

    /// <summary>
    /// Verifies that the assembly scan registers the resolver under the rate limit package's contract, as a
    /// singleton.
    /// </summary>
    /// <remarks>
    /// The registration is by reflection over marker interfaces, so nothing in the compiler checks it: a rename or a
    /// missing marker would leave the limiter with no resolver at all, silently partitioning every request by IP
    /// address and quietly undoing the reason the limiter is partitioned at all. It also has to be a singleton,
    /// because the limiter classifies requests from outside any request scope.
    /// </remarks>
    [Test]
    public void TheResolver_IsRegisteredAsASingletonUnderTheRateLimitContract()
    {
        var services = new ServiceCollection();
        services.Configure<SecuritySettings>(options => options.ApiKeys = new Dictionary<string, string> { ["testuser"] = ValidKey });
        services.AddCleanArchitecture("Codenized.Planixor");

        using ServiceProvider provider = services.BuildServiceProvider();

        var resolved = provider.GetService<IRateLimitIdentityResolver>();
        var again = provider.GetService<IRateLimitIdentityResolver>();

        Assert.Multiple(() =>
        {
            Assert.That(resolved, Is.InstanceOf<ApiKeyRateLimitIdentityResolver>());
            Assert.That(again, Is.SameAs(resolved), "the limiter resolves it outside any request scope");
        });
    }

    private static ApiKeyRateLimitIdentityResolver CreateResolver()
    {
        var settings = new SecuritySettings { ApiKeys = new Dictionary<string, string> { ["testuser"] = ValidKey } };
        var directory = new ApiKeyDirectory(Options.Create(settings));

        return new ApiKeyRateLimitIdentityResolver(directory);
    }

    private static HttpContext ContextWith(string authorization)
    {
        var context = new DefaultHttpContext();

        if (!string.IsNullOrEmpty(authorization))
        {
            context.Request.Headers.Authorization = authorization;
        }

        return context;
    }
}
