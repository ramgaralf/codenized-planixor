// <copyright file="ApiKeyAuthenticationHandlerTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Security.Authentication;

using System.Security.Claims;
using System.Text.Encodings.Web;
using global::Codenized.CleanArchitecture.Abstractions.Exceptions;
using global::Codenized.Planixor.Services.Authentication;
using global::Codenized.Planixor.Core.Services.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ApiKeyAuthenticationHandler"/>.
/// </summary>
[TestFixture]
public sealed class ApiKeyAuthenticationHandlerTests
{
    private const string SchemeName = "ApiKey";

    private ISecurityService securityService = null!;

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
    /// HandleAuthenticateAsync throws ForbiddenException when the API key is invalid.
    /// </summary>
    [Test]
    public async Task HandleAuthenticateAsync_InvalidApiKey_ThrowsForbiddenException()
    {
        // Arrange
        this.securityService.ValidateAPIKey("invalid-key").Returns(false);
        ApiKeyAuthenticationHandler handler = await this.CreateHandlerAsync(authorizationHeaderValue: "Bearer invalid-key");

        // Act & Assert
        Assert.ThrowsAsync<ForbiddenException>(async () => await handler.AuthenticateAsync());
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
        DefaultHttpContext httpContext = new DefaultHttpContext();

        if (authorizationHeaderValue is not null)
        {
            httpContext.Request.Headers["Authorization"] = authorizationHeaderValue;
        }

        await handler.InitializeAsync(scheme, httpContext);

        return handler;
    }
}
