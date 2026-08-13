// <copyright file="SyncDate.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos;

using System.Globalization;

/// <summary>
/// Parses the calendar dates that travel in sync payloads.
/// </summary>
/// <remarks>
/// <para>
/// Sync payloads carry days as <c>yyyy-MM-dd</c> strings. They used to be read with <c>DateOnly.Parse</c> and
/// <c>DateOnly.TryParse</c> with no culture, which follows the server's ambient culture: on an <c>es-ES</c> host
/// <c>"03/04/2026"</c> is 3 April and on <c>en-US</c> it is 4 March. Events landed on the wrong day silently, and
/// the <c>endDay &lt; startDay</c> check passed or failed inconsistently — a defect that only surfaces after a
/// locale change or a new base image.
/// </para>
/// <para>
/// Validation and parsing both go through here, so the two can no longer disagree about what a given string means.
/// </para>
/// </remarks>
public static class SyncDate
{
    /// <summary>The one accepted format. Exact, so a client sending anything else is told rather than guessed at.</summary>
    public const string Format = "yyyy-MM-dd";

    /// <summary>
    /// Attempts to read a sync date.
    /// </summary>
    /// <param name="value">The value as received from the client.</param>
    /// <param name="date">The parsed date, or its default when the value is not a sync date.</param>
    /// <returns><c>true</c> when the value parses.</returns>
    public static bool TryParse(string? value, out DateOnly date)
    {
        date = default;

        return !string.IsNullOrWhiteSpace(value)
            && DateOnly.TryParseExact(value, Format, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }

    /// <summary>
    /// Reads a sync date that has already been validated.
    /// </summary>
    /// <param name="value">The value as received from the client.</param>
    /// <returns>The parsed date.</returns>
    /// <exception cref="FormatException">
    /// Thrown when the value is not in <see cref="Format"/>. Reaching this means validation did not run, since the
    /// validator uses <see cref="TryParse"/> on the same string.
    /// </exception>
    public static DateOnly Parse(string? value)
    {
        if (!TryParse(value, out DateOnly date))
        {
            throw new FormatException($"'{value}' is not a date in {Format} format.");
        }

        return date;
    }
}
