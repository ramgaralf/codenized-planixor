// <copyright file="SyncCursorTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Sync;

using System.Text;
using global::Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using global::Codenized.Planixor.Persistence.MySql.Efc.Repositories;
using NUnit.Framework;

/// <summary>
/// Tests for the pagination cursor the six sync pull routes share.
/// </summary>
[TestFixture]
public sealed class SyncCursorTests
{
    /// <summary>Verifies a cursor survives a round trip unchanged.</summary>
    [Test]
    public void Encode_ThenDecode_ReturnsTheSamePosition()
    {
        var syncedAt = new DateTime(2026, 8, 11, 9, 15, 0, 123, DateTimeKind.Utc);
        Guid id = Guid.NewGuid();

        (DateTime SyncedAt, Guid Id) decoded = SyncCursor.Decode(SyncCursor.Encode(syncedAt, id));

        Assert.Multiple(() =>
        {
            Assert.That(decoded.SyncedAt, Is.EqualTo(syncedAt));
            Assert.That(decoded.Id, Is.EqualTo(id));
        });
    }

    /// <summary>
    /// Verifies that anything which is not a cursor this code issued is refused as a bad request.
    /// </summary>
    /// <remarks>
    /// Each of these used to reach an unguarded <c>Convert.FromBase64String</c>, <c>Split</c> and two <c>Parse</c>
    /// calls, so a client could turn any of them into a 500 — trivial to fuzz, and cheap to turn into a flood of
    /// logged exceptions. The cursor is caller-controlled input and gets treated as such.
    /// </remarks>
    /// <param name="cursor">The malformed cursor.</param>
    [TestCase("x", Description = "not base64")]
    [TestCase("!!!!", Description = "invalid base64 alphabet")]
    [TestCase("", Description = "empty")]
    [TestCase("   ", Description = "whitespace")]
    public void Decode_WithAMalformedCursor_ThrowsBadRequest(string cursor)
    {
        Assert.Throws<BadRequestException>(() => SyncCursor.Decode(cursor));
    }

    /// <summary>Verifies that valid base64 carrying nonsense is refused too.</summary>
    /// <param name="payload">The decoded payload the cursor would carry.</param>
    [TestCase("no-separator-here", Description = "missing separator")]
    [TestCase("not-a-date|11111111-1111-4111-8111-111111111111", Description = "invalid date")]
    [TestCase("2026-08-11T09:15:00.0000000Z|not-a-guid", Description = "invalid identifier")]
    [TestCase("|", Description = "both parts empty")]
    public void Decode_WithBase64CarryingNonsense_ThrowsBadRequest(string payload)
    {
        string cursor = Convert.ToBase64String(Encoding.UTF8.GetBytes(payload));

        Assert.Throws<BadRequestException>(() => SyncCursor.Decode(cursor));
    }

    /// <summary>Verifies that the non-throwing form reports failure rather than a default position.</summary>
    [Test]
    public void TryDecode_WithAMalformedCursor_ReturnsFalse()
    {
        Assert.That(SyncCursor.TryDecode("not-a-cursor", out _), Is.False);
    }
}
