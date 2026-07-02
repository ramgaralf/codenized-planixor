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
        // Red family
        "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",
        // Orange family
        "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",
        // Amber family
        "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",
        // Green family
        "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",
        // Teal family
        "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",
        // Blue family
        "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",
        // Purple family
        "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",
        // Pink family
        "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",
        // Gray family
        "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
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
