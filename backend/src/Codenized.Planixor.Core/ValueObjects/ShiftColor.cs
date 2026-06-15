// <copyright file="ShiftColor.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated shift background color from the predefined palette.
/// </summary>
public record ShiftColor
{
    /// <summary>
    /// The predefined color palette available for shift backgrounds.
    /// </summary>
    public static readonly IReadOnlySet<string> Palette = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "#EF4444",
        "#F97316",
        "#F59E0B",
        "#10B981",
        "#0B86D4",
        "#2563EB",
        "#7C3AED",
        "#EC4899",
        "#6B7280",
        "#1F2937",
    };

    /// <summary>
    /// Gets the hex color value.
    /// </summary>
    public string Value { get; }

    private ShiftColor(string value)
    {
        this.Value = value;
    }

    /// <summary>
    /// Creates a validated shift color.
    /// </summary>
    /// <param name="value">The hex color string.</param>
    /// <returns>A validated <see cref="ShiftColor"/> instance.</returns>
    public static ShiftColor Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException("Shift color cannot be empty.");
        }

        if (!Palette.Contains(value))
        {
            throw new DomainException("Shift color must be from the predefined palette.");
        }

        return new ShiftColor(value.ToUpperInvariant());
    }
}
