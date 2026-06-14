// <copyright file="AppSettingsTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor;

using global::Codenized.Planixor.Core.Settings;
using NUnit.Framework;

/// <summary>Tests for AppSettings default values.</summary>
[TestFixture]
public sealed class AppSettingsTests
{
    /// <summary>Verifies default values are correct.</summary>
    [Test]
    public void AppSettings_DefaultValues_AreCorrect()
    {
        // Arrange & Act
        var settings = new AppSettings();

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(settings.Product, Is.EqualTo(string.Empty));
            Assert.That(settings.Service, Is.EqualTo(string.Empty));
            Assert.That(settings.Friendly, Is.EqualTo(string.Empty));
            Assert.That(settings.Environment, Is.EqualTo(string.Empty));
            Assert.That(settings.AllowSwagger, Is.False);
            Assert.That(settings.ApiBasePath, Is.EqualTo("/api"));
            Assert.That(settings.HttpClientTimeoutMiliseconds, Is.EqualTo(5000));
        });
    }
}
