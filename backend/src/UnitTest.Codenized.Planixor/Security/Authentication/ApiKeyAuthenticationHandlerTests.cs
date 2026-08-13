// <copyright file="ApiKeyAuthenticationHandlerTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Security.Authentication;

using global::Codenized.CleanArchitecture.Exceptions.Abstractions.Forbidden;
using global::Codenized.CleanArchitecture.Exceptions.Abstractions.Unauthorized;
using global::Codenized.Planixor.Core.Services.Security;
using global::Codenized.Planixor.Services.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NUnit.Framework;
using System.Security.Claims;
using System.Text.Encodings.Web;

/// <summary>
/// Unit tests for <see cref="ApiKeyAuthenticationHandler"/>.
/// </summary>
[TestFixture]
public sealed class ApiKeyAuthenticationHandlerTests
{
    private const string SchemeName = "ApiKey";

    private ISecurityService securityService = null!;

    /// <summary>The context the handler under test was initialised with, so a test can read the response.</summary>
    private DefaultHttpContext httpContext = null!;

    /// <summary>
    /// Sets up shared test dependencies before each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.securityService = Substitute.For<ISecurityService>();
    }

    /// <summary>
    /// HandleAuthenticateAsync returns NoResult when no Authorization header is present.
    /// </summary>
    [Test]
    public async Task HandleAuthenticateAsync_NoAuthorizationHeader_ReturnsNoResult()
    {
        // Arrange
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: null);

        // Act
        AuthenticateResult result = await handler.AuthenticateAsync();

        // Assert
        Assert.That(result.Succeeded, Is.False);
        Assert.That(result.None, Is.True);
    }

    /// <summary>
    /// HandleAuthenticateAsync returns failure when the Authorization header has an invalid prefix.
    /// </summary>
    [Test]
    public async Task HandleAuthenticateAsync_InvalidPrefix_ReturnsFailure()
    {
        // Arrange
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: "Basic some-key-value");

        // Act
        AuthenticateResult result = await handler.AuthenticateAsync();

        // Assert
        Assert.That(result.Succeeded, Is.False);
        Assert.That(result.Failure, Is.Not.Null);
    }

    /// <summary>
    /// HandleAuthenticateAsync returns failure when the Bearer token is empty or whitespace.
    /// </summary>
    [Test]
    public async Task HandleAuthenticateAsync_EmptyToken_ReturnsFailure()
    {
        // Arrange
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: "Bearer    ");

        // Act
        AuthenticateResult result = await handler.AuthenticateAsync();

        // Assert
        Assert.That(result.Succeeded, Is.False);
        Assert.That(result.Failure, Is.Not.Null);
    }

    /// <summary>
    /// HandleAuthenticateAsync reports failure — not forbidden — when the API key is invalid.
    /// </summary>
    /// <remarks>
    /// A caller presenting a wrong credential is unauthenticated, which is a 401. This used to throw
    /// <c>ForbiddenException</c>, so the answer was a 403; and throwing out of the authenticate step bypassed the
    /// challenge path, so the response never carried WWW-Authenticate and a client implementing "on 401,
    /// re-authenticate" was never triggered.
    /// </remarks>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task HandleAuthenticateAsync_InvalidApiKey_FailsWithoutThrowing()
    {
        // Arrange
        this.securityService.ValidateAPIKey("invalid-key").Returns(false);
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: "Bearer invalid-key");

        // Act
        AuthenticateResult result = await handler.AuthenticateAsync();

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result.Succeeded, Is.False);
            Assert.That(result.Failure, Is.Not.Null);
        });
    }

    /// <summary>
    /// The challenge says how to authenticate before the 401 is produced.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task HandleChallengeAsync_SetsTheAuthenticateChallenge()
    {
        // Arrange
        this.securityService.ValidateAPIKey("invalid-key").Returns(false);
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: "Bearer invalid-key");

        // Act
        Assert.ThrowsAsync<UnauthorizedException>(async () => await handler.ChallengeAsync(properties: null));

        // Assert
        Assert.That(this.httpContext.Response.Headers.WWWAuthenticate.ToString(), Does.Contain(SchemeName));
    }

    /// <summary>
    /// HandleAuthenticateAsync returns success with username claim when the API key is valid.
    /// </summary>
    [Test]
    public async Task HandleAuthenticateAsync_ValidApiKey_ReturnsSuccessWithUsernameClaim()
    {
        // Arrange
        this.securityService.ValidateAPIKey("valid-key").Returns(true);
        this.securityService.GetAuthenticatedUsername().Returns("testuser");
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: "Bearer valid-key");

        // Act
        AuthenticateResult result = await handler.AuthenticateAsync();

        // Assert
        Assert.That(result.Succeeded, Is.True);
        Assert.That(result.Ticket, Is.Not.Null);
        Assert.That(result.Ticket!.Principal, Is.Not.Null);

        Claim? nameClaim = result.Ticket.Principal!.FindFirst(ClaimTypes.Name);
        Assert.That(nameClaim, Is.Not.Null);
        Assert.That(nameClaim!.Value, Is.EqualTo("testuser"));
    }

    private async Task<ApiKeyAuthenticationHandler> CreateHandlerAsync(string? authorizationHeaderValue)
    {
        var options = new AuthenticationSchemeOptions();
        IOptionsMonitor<AuthenticationSchemeOptions> optionsMonitor = Substitute.For<IOptionsMonitor<AuthenticationSchemeOptions>>();
        optionsMonitor.Get(SchemeName).Returns(options);

        ILoggerFactory loggerFactory = NullLoggerFactory.Instance;

        var handler = new ApiKeyAuthenticationHandler(
            optionsMonitor,
            loggerFactory,
            UrlEncoder.Default,
            this.securityService);

        var scheme = new AuthenticationScheme(SchemeName, displayName: null, handlerType: typeof(ApiKeyAuthenticationHandler));
        this.httpContext = new DefaultHttpContext();

        if (authorizationHeaderValue is not null)
        {
            this.httpContext.Request.Headers["Authorization"] = authorizationHeaderValue;
        }

        await handler.InitializeAsync(scheme, this.httpContext);

        return handler;
    }
}
