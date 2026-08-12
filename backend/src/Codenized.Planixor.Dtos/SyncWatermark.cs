// <copyright file="SyncWatermark.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos;

using Codenized.CleanArchitecture.Abstractions.Validations;
using Codenized.CleanArchitecture.Abstractions.Validations.Exceptions;

/// <summary>
/// Normalises the <c>lastSyncedAt</c> watermark a pull request carries.
/// </summary>
/// <remarks>
/// <para>
/// The parameter arrives from the query string bound as a plain <see cref="DateTime"/> and is compared against a
/// <c>datetime(6)</c> column stored in UTC. Bound values do not all mean the same thing:
/// <c>?lastSyncedAt=2026-01-01T00:00:00Z</c> comes back as <see cref="DateTimeKind.Utc"/>,
/// <c>…T00:00:00%2B02:00</c> as <see cref="DateTimeKind.Local"/> converted through the *server's* time zone, and a
/// bare <c>…T00:00:00</c> as <see cref="DateTimeKind.Unspecified"/>. Comparing those against UTC unchanged means a
/// client gets records skipped or repeated depending on where the server happens to run — and on the device the
/// data simply goes missing, with no error anywhere.
/// </para>
/// </remarks>
public static class SyncWatermark
{
    /// <summary>
    /// How far into the future a watermark may be before it is treated as unusable.
    /// </summary>
    /// <remarks>
    /// A little slack absorbs ordinary clock skew between the device and the server. Beyond that the value is not
    /// skew, it is a wrong clock or a wrong unit, and honouring it would silently return nothing at all — which the
    /// user experiences as their data having disappeared.
    /// </remarks>
    public static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Converts the requested watermark to the UTC instant the query should compare against.
    /// </summary>
    /// <param name="lastSyncedAt">The value as bound from the query string, or <see langword="null"/> for a full sync.</param>
    /// <returns>
    /// The UTC instant to filter from. <see cref="DateTime.MinValue"/> when no watermark was supplied, which pulls
    /// everything.
    /// </returns>
    /// <exception cref="ValidationException">
    /// Thrown when the watermark is further into the future than <see cref="FutureTolerance"/>. It surfaces as a 400
    /// naming the parameter, which is what a bad request value deserves.
    /// </exception>
    public static DateTime Normalise(DateTime? lastSyncedAt)
    {
        if (lastSyncedAt is null)
        {
            return DateTime.MinValue;
        }

        DateTime value = lastSyncedAt.Value;

        DateTime utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),

            // No offset was given. The API documents timestamps as UTC, so read it as UTC rather than as the
            // server's local time — which is what the previous code did implicitly, and what made the result depend
            // on the host's time zone.
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

        if (utc > DateTime.UtcNow.Add(FutureTolerance))
        {
            IFailure[] failures =
            [
                new Failure("lastSyncedAt", "The watermark is in the future. Send the timestamp of your last successful sync, in UTC."),
            ];

            throw new ValidationException(
                "BAD_REQUEST",
                "Request validation",
                "One or more parameters of the request are incorrect.",
                failures);
        }

        return utc;
    }
}
