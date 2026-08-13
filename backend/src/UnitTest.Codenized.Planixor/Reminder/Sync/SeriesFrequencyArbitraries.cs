// <copyright file="SeriesFrequencyArbitraries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Sync;

using global::Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Provides FsCheck arbitrary generators for series frequency property tests.
/// </summary>
public sealed class SeriesFrequencyArbitraries
{
    /// <summary>Generates valid frequency push inputs.</summary>
    /// <returns>An arbitrary for <see cref="ValidFrequencyPushInput"/>.</returns>
    public static Arbitrary<ValidFrequencyPushInput> GenerateValidFrequencyPushInput()
    {
        Gen<ValidFrequencyPushInput> gen =
            from frequencyIndex in Gen.Choose(0, ReminderSeriesSyncPropertyTests.ValidFrequencies.Length - 1)
            select new ValidFrequencyPushInput(ReminderSeriesSyncPropertyTests.ValidFrequencies[frequencyIndex]);

        return gen.ToArbitrary();
    }

    /// <summary>Generates invalid frequency push inputs (non-null, non-whitespace strings not in the valid set).</summary>
    /// <returns>An arbitrary for <see cref="InvalidFrequencyPushInput"/>.</returns>
    public static Arbitrary<InvalidFrequencyPushInput> GenerateInvalidFrequencyPushInput()
    {
        Gen<char> alphanumChar = Gen.Elements(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
            'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
            '8', '9', '-', '_', '!', '@', '#');

        // Generate strings that are guaranteed not to match any valid frequency (case-insensitive)
        Gen<string> invalidStringGen =
            from length in Gen.Choose(1, 20)
            from chars in alphanumChar.ArrayOf(length)
            let candidate = new string(chars)
            where !ReminderSeriesSyncPropertyTests.ValidFrequencies.Contains(candidate, StringComparer.OrdinalIgnoreCase)
            select candidate;

        Gen<InvalidFrequencyPushInput> gen =
            from value in invalidStringGen
            select new InvalidFrequencyPushInput(value);

        return gen.ToArbitrary();
    }

    /// <summary>Generates null or whitespace frequency inputs.</summary>
    /// <returns>An arbitrary for <see cref="NullOrWhitespaceFrequencyInput"/>.</returns>
    public static Arbitrary<NullOrWhitespaceFrequencyInput> GenerateNullOrWhitespaceFrequencyInput()
    {
        Gen<NullOrWhitespaceFrequencyInput> gen = Gen.Elements(
            new NullOrWhitespaceFrequencyInput(null),
            new NullOrWhitespaceFrequencyInput(string.Empty),
            new NullOrWhitespaceFrequencyInput(" "),
            new NullOrWhitespaceFrequencyInput("  "));

        return gen.ToArbitrary();
    }

    /// <summary>Generates pull mapping inputs with valid frequencies.</summary>
    /// <returns>An arbitrary for <see cref="PullMappingInput"/>.</returns>
    public static Arbitrary<PullMappingInput> GeneratePullMappingInput()
    {
        Gen<PullMappingInput> gen =
            from frequencyIndex in Gen.Choose(0, ReminderSeriesSyncPropertyTests.ValidFrequencies.Length - 1)
            select new PullMappingInput(ReminderSeriesSyncPropertyTests.ValidFrequencies[frequencyIndex]);

        return gen.ToArbitrary();
    }
}
