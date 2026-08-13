// <copyright file="SyncDateAndWatermarkTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Sync;

using System.Globalization;
using global::Codenized.Planixor.Dtos;
using NUnit.Framework;

/// <summary>
/// Tests for how sync payloads read dates and the pull watermark.
/// </summary>
[TestFixture]
public sealed class SyncDateAndWatermarkTests
{
    /// <summary>
    /// Verifies that a sync date means the same thing whatever culture the server happens to run under.
    /// </summary>
    /// <remarks>
    /// Days used to be read with a culture-sensitive <c>DateOnly.Parse</c>: on an <c>es-ES</c> host
    /// <c>"03/04/2026"</c> is 3 April and on <c>en-US</c> it is 4 March. Events landed on the wrong day silently,
    /// and the end-before-start check passed or failed inconsistently — visible only after a locale change or a new
    /// base image.
    /// </remarks>
    /// <param name="culture">The ambient culture the parse runs under.</param>
    [TestCase("es-ES")]
    [TestCase("en-US")]
    [TestCase("de-DE")]
    public void Parse_UnderAnyCulture_ReadsTheSameDay(string culture)
    {
        CultureInfo original = CultureInfo.CurrentCulture;

        try
        {
            CultureInfo.CurrentCulture = new CultureInfo(culture);

            Assert.That(SyncDate.Parse("2026-04-03"), Is.EqualTo(new DateOnly(2026, 4, 3)));
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    /// <summary>Verifies that only the documented format is accepted.</summary>
    /// <param name="value">The rejected value.</param>
    [TestCase("03/04/2026")]
    [TestCase("2026-4-3")]
    [TestCase("11 August 2026")]
    [TestCase("")]
    [TestCase(null)]
    public void TryParse_WithAnythingButTheDocumentedFormat_ReturnsFalse(string? value)
    {
        Assert.That(SyncDate.TryParse(value, out _), Is.False);
    }

    /// <summary>
    /// Verifies that the same instant expressed three ways produces one UTC watermark.
    /// </summary>
    /// <remarks>
    /// The parameter is bound from the query string and compared against a UTC column. Taken as-is, an offset form
    /// arrived as local time converted through the server's zone and a bare form was read as server-local, so a
    /// client got records skipped or repeated depending on where the server ran — and on the device the data simply
    /// went missing, with no error.
    /// </remarks>
    [Test]
    public void Normalise_WithTheSameInstantExpressedThreeWays_ProducesOneUtcValue()
    {
        var utc = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        DateTime withOffset = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.FromHours(2)).LocalDateTime;
        var unspecified = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Unspecified);

        Assert.Multiple(() =>
        {
            Assert.That(SyncWatermark.Normalise(utc), Is.EqualTo(utc));
            Assert.That(SyncWatermark.Normalise(withOffset), Is.EqualTo(utc));
            Assert.That(SyncWatermark.Normalise(unspecified), Is.EqualTo(utc));
        });
    }

    /// <summary>Verifies that no watermark means a full sync rather than an empty one.</summary>
    [Test]
    public void Normalise_WithoutAWatermark_PullsEverything()
    {
        Assert.That(SyncWatermark.Normalise(null), Is.EqualTo(DateTime.MinValue));
    }

    /// <summary>
    /// Verifies that a watermark well into the future is clamped to the present rather than refused.
    /// </summary>
    /// <remarks>
    /// The client cannot avoid sending one: the Android app derives the watermark from the device clock
    /// (<c>SyncServiceController.kt</c>, <c>System.currentTimeMillis()</c>) and the pull response carries no server
    /// timestamp it could use instead. Refusing would leave a device with a fast clock unable to sync at all, which
    /// is the same outcome as the silent empty page this replaced — only louder. Clamping returns everything
    /// modified up to now.
    /// </remarks>
    [Test]
    public void Normalise_WithAWatermarkInTheFuture_IsClampedToNow()
    {
        DateTime before = DateTime.UtcNow;
        DateTime future = before.Add(SyncWatermark.FutureTolerance).AddHours(1);

        DateTime result = SyncWatermark.Normalise(future);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.GreaterThanOrEqualTo(before));
            Assert.That(result, Is.LessThanOrEqualTo(DateTime.UtcNow));
        });
    }

    /// <summary>Verifies that ordinary clock skew between device and server is honoured as sent.</summary>
    [Test]
    public void Normalise_WithinTheSkewTolerance_IsTakenAtFaceValue()
    {
        DateTime slightlyAhead = DateTime.SpecifyKind(DateTime.UtcNow.AddMinutes(1), DateTimeKind.Utc);

        Assert.That(SyncWatermark.Normalise(slightlyAhead), Is.EqualTo(slightlyAhead));
    }
}
