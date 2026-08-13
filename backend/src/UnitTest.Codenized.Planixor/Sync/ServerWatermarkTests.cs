// <copyright file="ServerWatermarkTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Sync;

using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using global::Codenized.Planixor.Dtos.CalendarEvent.Sync;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPull;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPull.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Pins where the pull watermark comes from.
/// </summary>
/// <remarks>
/// A calendar event created in one browser did not appear in another. The record was stored correctly; the pull
/// never returned it. The filter is <c>SyncedAt &gt; lastSyncedAt</c>, where <c>SyncedAt</c> is stamped by this
/// server and <c>lastSyncedAt</c> was produced by the browser's own clock — two different clocks compared as if
/// they were one. Anything stamped inside the drift between them was invisible for good.
/// <para>
/// The response now carries the server's own clock, read before the query, and the clients send that back. Two
/// things have to stay true for it to work, and both are asserted here.
/// </para>
/// </remarks>
[TestFixture]
public sealed class ServerWatermarkTests
{
    /// <summary>
    /// Verifies that the value returned to the client is no later than the moment the query ran.
    /// </summary>
    /// <remarks>
    /// Reading the clock after the query would reintroduce the original defect in miniature: records stamped while
    /// the query was executing would sit below the returned watermark without having been in its result, so the
    /// next cycle would ask for something later and skip them.
    /// </remarks>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task ThePullResponse_CarriesAClockReadBeforeTheQuery()
    {
        var queries = Substitute.For<ICalendarEventSyncPullQueries>();
        DateTime whenTheQueryRan = default;

        queries.GetModifiedAfterAsync(
                Arg.Any<string>(), Arg.Any<DateTime>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                whenTheQueryRan = DateTime.UtcNow;
                return Task.FromResult(new CalendarEventSyncPullResult
                {
                    CalendarEvents = [],
                    Cursor = null,
                    HasMore = false,
                });
            });

        var service = new CalendarEventSyncPullService(
            Substitute.For<ILogger<CalendarEventSyncPullService>>(),
            queries);

        CalendarEventSyncPullResponse response = await service.Run(
            new CalendarEventSyncPullRequest("testuser", null, null),
            CancellationToken.None);

        Assert.That(response.ServerSyncedAt, Is.LessThanOrEqualTo(whenTheQueryRan));
    }

    /// <summary>
    /// Verifies that every pull service reads the clock before it runs its query.
    /// </summary>
    /// <remarks>
    /// The test above can only prove it for the one service it exercises. Six services share this shape, and the
    /// ordering of two statements is not something a substitute can check across all of them, so the source is read
    /// instead.
    /// </remarks>
    [Test]
    public void EveryPullService_ReadsTheClockBeforeItQueries()
    {
        string directory = Path.Combine(RepositoryRoot(), "backend/src/Codenized.Planixor.UseCases");

        Assert.That(Directory.Exists(directory), Is.True, $"the use cases project is not at {directory}");

        string[] services = Directory
            .EnumerateFiles(directory, "*SyncPullService.cs", SearchOption.AllDirectories)
            .ToArray();

        Assert.That(services, Has.Length.EqualTo(6), "the number of pull services changed; this test needs to follow it");

        var wrong = new List<string>();

        foreach (string file in services)
        {
            string[] lines = File.ReadAllLines(file);

            int capture = Array.FindIndex(lines, l => Regex.IsMatch(l, @"DateTime\s+serverSyncedAt\s*=\s*DateTime\.UtcNow"));
            int query = Array.FindIndex(lines, l => l.Contains("await this.queries.", StringComparison.Ordinal));

            if (capture < 0 || query < 0 || capture > query)
            {
                wrong.Add($"  {Path.GetFileName(file)} — capture at {capture}, query at {query}");
            }
        }

        Assert.That(
            wrong,
            Is.Empty,
            $"these read the clock after querying, or not at all:{Environment.NewLine}{string.Join(Environment.NewLine, wrong)}");
    }

    /// <summary>
    /// Verifies that neither client derives the pull watermark from its own clock.
    /// </summary>
    /// <remarks>
    /// This is the defect that reached production, stated as a test. The React controller used
    /// <c>new Date().toISOString()</c> and the Android adapters <c>System.currentTimeMillis()</c>; both were
    /// compared against a column this server stamps. Nothing in either codebase said the two had to agree, so
    /// nothing objected when they did not.
    /// </remarks>
    [Test]
    public void NeitherClient_DerivesTheWatermarkFromItsOwnClock()
    {
        string root = RepositoryRoot();
        var offenders = new List<string>();

        string react = File.ReadAllText(Path.Combine(root, "frontend/react-web/src/features/sync/services/syncServiceController.ts"));

        // Narrow on purpose: the file legitimately builds Date objects to compare record timestamps. What it may
        // never do again is mint an ISO instant from this device and use it as a watermark.
        if (react.Contains("new Date().toISOString()", StringComparison.Ordinal))
        {
            offenders.Add("  syncServiceController.ts reads the device clock");
        }

        string androidSync = Path.Combine(root, "frontend/android-app/app/src/main/java/com/codenized/planixor/data/sync");

        Assert.That(Directory.Exists(androidSync), Is.True, $"the Android sync package is not at {androidSync}");

        foreach (string file in Directory.EnumerateFiles(androidSync, "*.kt"))
        {
            // The adapters stamp local records with the device clock, and the UI label for "last synced" is
            // honestly this device's clock too. What may never come back is a watermark typed as an epoch: a
            // Long here can only have been produced locally, since the server sends an instant as text.
            string text = File.ReadAllText(file);

            if (text.Contains("sync(lastSyncedAt: Long?)", StringComparison.Ordinal)
                || text.Contains("pull(lastSyncedAt: Long?)", StringComparison.Ordinal))
            {
                offenders.Add($"  {Path.GetFileName(file)} reads the device clock");
            }
        }

        Assert.That(
            offenders,
            Is.Empty,
            $"the watermark must be the serverSyncedAt the server returned:{Environment.NewLine}{string.Join(Environment.NewLine, offenders)}");
    }

    private static string RepositoryRoot([CallerFilePath] string thisFile = "")
    {
        DirectoryInfo? directory = new FileInfo(thisFile).Directory;

        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "frontend")))
        {
            directory = directory.Parent;
        }

        Assert.That(directory, Is.Not.Null, "the repository root could not be located from this file");

        return directory!.FullName;
    }
}
