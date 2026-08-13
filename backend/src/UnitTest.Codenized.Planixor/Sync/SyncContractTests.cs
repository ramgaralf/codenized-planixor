// <copyright file="SyncContractTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Sync;

using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using global::Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;
using global::Codenized.Planixor.Dtos.CalendarEvent.Sync;
using global::Codenized.Planixor.Dtos.NotificationRecord.Sync;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.Dtos.Shift.Sync;
using NUnit.Framework;

/// <summary>
/// Pins the parts of the sync API that the React PWA and the Android app depend on.
/// </summary>
/// <remarks>
/// These are not tests of the backend's own logic. They exist because two clients in this repository make
/// assumptions about the server that nothing in the server states, and a change on either side breaks the other
/// only in production. The batch ceiling is the clearest case: it is a number agreed in three places and written
/// down in none.
/// </remarks>
[TestFixture]
public sealed class SyncContractTests
{
    /// <summary>The batch ceiling the whole system agrees on.</summary>
    private const int AgreedBatchSize = 100;

    /// <summary>
    /// Verifies that every entity that limits a push batch limits it to the same number.
    /// </summary>
    /// <remarks>
    /// A client chunks its queue once and pushes every entity with the same batch size. If one entity's ceiling
    /// drifted, that entity alone would start failing, which is a hard defect to read from the client side.
    /// </remarks>
    [Test]
    public void EveryEntity_CapsThePushBatchAtTheSameSize()
    {
        Assert.Multiple(() =>
        {
            Assert.That(ShiftSyncPushRequestValidator.MaxBatchSize, Is.EqualTo(AgreedBatchSize));
            Assert.That(CalendarEventSyncPushRequestValidator.MaxBatchSize, Is.EqualTo(AgreedBatchSize));
            Assert.That(ReminderSyncPushRequestValidator.MaxBatchSize, Is.EqualTo(AgreedBatchSize));
            Assert.That(NotificationRecordSyncPushRequestValidator.MaxBatchSize, Is.EqualTo(AgreedBatchSize));
            Assert.That(AnnualHoursConfigSyncPushRequestValidator.MaxBatchSize, Is.EqualTo(AgreedBatchSize));
        });
    }

    /// <summary>
    /// Verifies that the React PWA chunks its push queue to the size the server accepts.
    /// </summary>
    /// <remarks>
    /// Raising the server ceiling alone is harmless; lowering it, or raising the client's, means every push over the
    /// new limit comes back 400. The client treats a 4xx on push as "the server rejected these records" and marks
    /// them synced, so the failure is silent data loss rather than an error anyone sees.
    /// </remarks>
    [Test]
    public void TheReactClient_ChunksToTheSameBatchSize()
    {
        string source = ReadClientFile("frontend/react-web/src/features/sync/services/syncServiceController.ts");

        Match match = Regex.Match(source, @"PUSH_BATCH_SIZE\s*=\s*(\d+)");

        Assert.That(match.Success, Is.True, "PUSH_BATCH_SIZE was not found — the client was restructured and this test needs to follow it");
        Assert.That(int.Parse(match.Groups[1].Value), Is.EqualTo(AgreedBatchSize));
    }

    /// <summary>
    /// Verifies that every Android sync adapter chunks its push queue to the size the server accepts.
    /// </summary>
    [Test]
    public void TheAndroidClient_ChunksToTheSameBatchSize()
    {
        string directory = Path.Combine(RepositoryRoot(), "frontend/android-app/app/src/main/java/com/codenized/planixor/data/sync");

        Assert.That(Directory.Exists(directory), Is.True, $"the Android sync package is not at {directory}");

        var declared = new Dictionary<string, int>(StringComparer.Ordinal);

        foreach (string file in Directory.EnumerateFiles(directory, "*.kt"))
        {
            Match match = Regex.Match(File.ReadAllText(file), @"MAX_BATCH_SIZE\s*=\s*(\d+)");

            if (match.Success)
            {
                declared[Path.GetFileName(file)] = int.Parse(match.Groups[1].Value);
            }
        }

        Assert.That(declared, Is.Not.Empty, "no MAX_BATCH_SIZE was found in the Android sync package");
        Assert.That(
            declared.Values,
            Is.All.EqualTo(AgreedBatchSize),
            $"these adapters disagree with the server: {string.Join(", ", declared.Select(d => $"{d.Key}={d.Value}"))}");
    }

    /// <summary>
    /// Verifies that a batch of exactly the agreed size is accepted, and one record more is refused.
    /// </summary>
    /// <remarks>
    /// Exercised on the two entities whose request validator inspects only the batch, so the boundary can be tested
    /// without also constructing records that satisfy every per-record rule. The other three share the constant
    /// asserted above.
    /// </remarks>
    [Test]
    public void TheBatchCeiling_IsExactlyTheAgreedSize()
    {
        var calendarEvents = new CalendarEventSyncPushRequestValidator();
        var notifications = new NotificationRecordSyncPushRequestValidator();

        Assert.Multiple(() =>
        {
            Assert.That(RejectsBatch(calendarEvents, new CalendarEventSyncPushRequest(Placeholder<CalendarEventSyncRecord>(AgreedBatchSize))), Is.False);
            Assert.That(RejectsBatch(calendarEvents, new CalendarEventSyncPushRequest(Placeholder<CalendarEventSyncRecord>(AgreedBatchSize + 1))), Is.True);
            Assert.That(RejectsBatch(notifications, new NotificationRecordSyncPushRequest(Placeholder<NotificationRecordSyncRecord>(AgreedBatchSize))), Is.False);
            Assert.That(RejectsBatch(notifications, new NotificationRecordSyncPushRequest(Placeholder<NotificationRecordSyncRecord>(AgreedBatchSize + 1))), Is.True);
        });
    }

    /// <summary>
    /// Verifies that an empty batch is refused.
    /// </summary>
    /// <remarks>
    /// Neither client sends one — both derive their batches by chunking, which yields nothing from an empty queue —
    /// so this records the rule rather than guarding a path they exercise.
    /// </remarks>
    [Test]
    public void AnEmptyBatch_IsRefused()
    {
        var validator = new CalendarEventSyncPushRequestValidator();

        validator.Validate(new CalendarEventSyncPushRequest([]));

        Assert.That(validator.Failures.Any(f => f.ErrorMessage.Contains("at least one", StringComparison.Ordinal)), Is.True);
    }

    private static bool RejectsBatch<TRequest>(dynamic validator, TRequest request)
    {
        validator.Validate(request);

        IEnumerable<dynamic> failures = validator.Failures;

        return failures.Any(f => ((string)f.ErrorMessage).Contains("Batch size exceeds", StringComparison.Ordinal));
    }

    private static List<T> Placeholder<T>(int count) => Enumerable.Repeat(default(T)!, count).ToList();

    private static string ReadClientFile(string relativePath)
    {
        string full = Path.Combine(RepositoryRoot(), relativePath);

        Assert.That(File.Exists(full), Is.True, $"the client file is not at {full}");

        return File.ReadAllText(full);
    }

    private static string RepositoryRoot([CallerFilePath] string thisFile = "")
    {
        // Anchored to this file's compile-time path: the working directory differs between a console run, an IDE run
        // and CI, and the clients sit outside the solution.
        DirectoryInfo? directory = new FileInfo(thisFile).Directory;

        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "frontend")))
        {
            directory = directory.Parent;
        }

        Assert.That(directory, Is.Not.Null, "the repository root could not be located from this file");

        return directory!.FullName;
    }
}
