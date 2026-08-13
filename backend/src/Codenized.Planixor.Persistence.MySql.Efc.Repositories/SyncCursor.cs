// <copyright file="SyncCursor.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories;

using System.Globalization;
using System.Text;
using Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;

/// <summary>
/// Encodes and decodes the keyset pagination cursor the six sync pull routes share.
/// </summary>
/// <remarks>
/// <para>
/// The cursor is the last row's <c>SyncedAt</c> and <c>Id</c>, base64 encoded so a client treats it as opaque. It
/// is not signed or encrypted: a caller can forge one, and the worst they can do is page through their own records
/// from a position of their choosing, because every query is still scoped to the authenticated user.
/// </para>
/// <para>
/// What a caller must not be able to do is crash the request. Each route used to decode inline with
/// <c>Convert.FromBase64String</c>, a <c>Split</c> and two <c>Parse</c> calls, over input entirely under the
/// client's control and with no guard at all: invalid base64, an invalid date, an invalid GUID or a missing
/// separator each produced a 500. Trivial to fuzz, and cheap to turn into a flood of logged exceptions.
/// </para>
/// </remarks>
internal static class SyncCursor
{
    private const string Separator = "|";

    /// <summary>Round-trip format, so the encoded instant survives decoding exactly.</summary>
    private const string DateTimeFormat = "o";

    /// <summary>
    /// Encodes a position.
    /// </summary>
    /// <param name="syncedAt">The last row's synchronisation timestamp.</param>
    /// <param name="id">The last row's identifier, which breaks ties on equal timestamps.</param>
    /// <returns>The opaque cursor.</returns>
    public static string Encode(DateTime syncedAt, Guid id)
    {
        string payload = string.Concat(
            syncedAt.ToString(DateTimeFormat, CultureInfo.InvariantCulture),
            Separator,
            id.ToString());

        return Convert.ToBase64String(Encoding.UTF8.GetBytes(payload));
    }

    /// <summary>
    /// Decodes a position.
    /// </summary>
    /// <param name="cursor">The cursor as received from the client.</param>
    /// <returns>The timestamp and identifier it encodes.</returns>
    /// <exception cref="BadRequestException">
    /// Thrown for anything that is not a cursor this type produced. The catalogue turns it into a 400, which is what
    /// a malformed request parameter deserves.
    /// </exception>
    public static (DateTime SyncedAt, Guid Id) Decode(string cursor)
    {
        if (!TryDecode(cursor, out (DateTime SyncedAt, Guid Id) position))
        {
            throw new BadRequestException(
                "INVALID_CURSOR",
                "Invalid cursor",
                "The cursor is not one this endpoint issued. Omit it to start from the first page.");
        }

        return position;
    }

    /// <summary>
    /// Attempts to decode a position.
    /// </summary>
    /// <param name="cursor">The cursor as received from the client.</param>
    /// <param name="position">The decoded position, or its default when the cursor is not valid.</param>
    /// <returns><c>true</c> when the cursor decodes.</returns>
    public static bool TryDecode(string? cursor, out (DateTime SyncedAt, Guid Id) position)
    {
        position = default;

        if (string.IsNullOrWhiteSpace(cursor))
        {
            return false;
        }

        byte[] bytes;

        try
        {
            bytes = Convert.FromBase64String(cursor);
        }
        catch (FormatException)
        {
            return false;
        }

        string decoded;

        try
        {
            decoded = Encoding.UTF8.GetString(bytes);
        }
        catch (ArgumentException)
        {
            return false;
        }

        string[] parts = decoded.Split(Separator, 2);

        if (parts.Length != 2)
        {
            return false;
        }

        if (!DateTime.TryParse(parts[0], CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out DateTime syncedAt))
        {
            return false;
        }

        if (!Guid.TryParse(parts[1], out Guid id))
        {
            return false;
        }

        position = (syncedAt, id);
        return true;
    }
}
