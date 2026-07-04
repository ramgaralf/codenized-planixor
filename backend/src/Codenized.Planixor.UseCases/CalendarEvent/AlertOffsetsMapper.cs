// <copyright file="AlertOffsetsMapper.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent;

using System.Text.Json;

/// <summary>
/// Provides mapping and validation helpers for alert offsets between the DTO (List of int)
/// and the entity/DB representation (JSON string).
/// </summary>
public static class AlertOffsetsMapper
{
    private const int MaxElements = 4;
    private static readonly HashSet<int> ValidOffsets = [0, 10, 60, 1440];

    /// <summary>
    /// Serializes a list of alert offset values to a JSON array string for storage.
    /// Validates values (must be in {0, 10, 60, 1440}), removes duplicates, and truncates to max 4 elements.
    /// </summary>
    /// <param name="alertOffsets">The alert offsets from the DTO.</param>
    /// <returns>A JSON array string (e.g., "[0,10,60]").</returns>
    public static string Serialize(List<int>? alertOffsets)
    {
        if (alertOffsets is null || alertOffsets.Count == 0)
        {
            return "[]";
        }

        List<int> validated = alertOffsets
            .Where(offset => ValidOffsets.Contains(offset))
            .Distinct()
            .Take(MaxElements)
            .ToList();

        return JsonSerializer.Serialize(validated);
    }

    /// <summary>
    /// Deserializes a JSON array string from the database to a list of alert offset values.
    /// Returns an empty list if the input is null, empty, or invalid JSON.
    /// </summary>
    /// <param name="alertOffsetsJson">The JSON array string from the entity (e.g., "[0,10,60]").</param>
    /// <returns>A list of valid alert offset integers.</returns>
    public static List<int> Deserialize(string? alertOffsetsJson)
    {
        if (string.IsNullOrWhiteSpace(alertOffsetsJson))
        {
            return [];
        }

        try
        {
            List<int>? offsets = JsonSerializer.Deserialize<List<int>>(alertOffsetsJson);
            if (offsets is null)
            {
                return [];
            }

            return offsets
                .Where(offset => ValidOffsets.Contains(offset))
                .Distinct()
                .Take(MaxElements)
                .ToList();
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
