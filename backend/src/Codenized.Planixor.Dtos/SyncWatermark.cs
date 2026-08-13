// <copyright file="SyncWatermark.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos;

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
    /// How far into the future a watermark is taken at face value.
    /// </summary>
    /// <remarks>
    /// A little slack absorbs ordinary clock skew between the device and the server, so a watermark a few seconds
    /// ahead is honoured as sent. Beyond that the value is not skew, it is a wrong clock or a wrong unit.
    /// </remarks>
    public static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Converts the requested watermark to the UTC instant the query should compare against.
    /// </summary>
    /// <param name="lastSyncedAt">The value as bound from the query string, or <see langword="null"/> for a full sync.</param>
    /// <returns>
    /// The UTC instant to filter from. <see cref="DateTime.MinValue"/> when no watermark was supplied, which pulls
    /// everything; never later than now.
    /// </returns>
    /// <remarks>
    /// A watermark beyond <see cref="FutureTolerance"/> is clamped to the present rather than refused. The client
    /// cannot avoid sending one: the Android app derives it from the device clock
    /// (<c>SyncServiceController.kt</c>, <c>System.currentTimeMillis()</c>) and the pull response carries no server
    /// timestamp for it to use instead. Refusing would leave a device with a fast clock unable to sync at all, which
    /// is the same outcome as the silent empty page this replaced — only louder. Clamping syncs everything up to
    /// now, which is what the user is asking for.
    /// </remarks>
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

        DateTime now = DateTime.UtcNow;

        return utc > now.Add(FutureTolerance) ? now : utc;
    }
}
