// <copyright file="OneTypePerFileTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor;

using System.Runtime.CompilerServices;
using NUnit.Framework;

/// <summary>
/// Enforces that a source file declares at most one type, counting nested ones.
/// </summary>
/// <remarks>
/// <para>
/// StyleCop has two rules for this — SA1402 and SA1649 — and neither can do the job here. StyleCop 1.1.118 predates
/// C# 10, and its syntax walk does not descend into a <b>file-scoped</b> namespace, so on <c>namespace X;</c> both
/// rules see an empty compilation unit and report nothing. Practically every file in this repository is file-scoped.
/// SA1402 also only ever looks at top-level types, so a nested one is invisible to it in any case.
/// </para>
/// <para>
/// This test parses the real thing with Roslyn instead, and counts every type declaration at any depth.
/// </para>
/// </remarks>
[TestFixture]
public sealed class OneTypePerFileTests
{
    /// <summary>Verifies that no source file declares more than one type.</summary>
    [Test]
    public void NoSourceFile_DeclaresMoreThanOneType()
    {
        List<string> violations = OneTypePerFileScanner.Scan(SourceRoot());

        Assert.That(
            violations,
            Is.Empty,
            $"each of these files declares more than one type:{Environment.NewLine}{string.Join(Environment.NewLine, violations)}");
    }

    /// <summary>
    /// Verifies that the scanner actually detects a violation, so an empty result means "nothing to find" rather
    /// than "nothing was looked at".
    /// </summary>
    [Test]
    public void TheScanner_DetectsAViolation()
    {
        Assert.Multiple(() =>
        {
            Assert.That(OneTypePerFileScanner.CountTypes("namespace Probe;\npublic sealed class One { }\npublic sealed class Two { }"), Is.EqualTo(2));
            Assert.That(OneTypePerFileScanner.CountTypes("namespace Probe;\npublic sealed class One { private sealed class Nested { } }"), Is.EqualTo(2), "a nested type counts");
            Assert.That(OneTypePerFileScanner.CountTypes("namespace Probe;\npublic sealed class One { }"), Is.EqualTo(1));
        });
    }

    /// <summary>Verifies that the scan reaches a meaningful number of files.</summary>
    [Test]
    public void TheScan_CoversTheSourceTree()
    {
        Assert.That(OneTypePerFileScanner.CountScannedFiles(SourceRoot()), Is.GreaterThan(100));
    }

    private static string SourceRoot([CallerFilePath] string thisFile = "")
    {
        // Anchored to this file's compile-time path rather than to the working directory, which differs between a
        // console run, an IDE run and CI.
        DirectoryInfo? directory = new FileInfo(thisFile).Directory;

        while (directory is not null && !directory.EnumerateFiles("*.slnx").Any())
        {
            directory = directory.Parent;
        }

        Assert.That(directory, Is.Not.Null, "the repository root could not be located from this file");

        return Path.Combine(directory!.FullName, "src");
    }
}
