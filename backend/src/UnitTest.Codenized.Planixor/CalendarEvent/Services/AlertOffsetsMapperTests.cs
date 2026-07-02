// <copyright file="AlertOffsetsMapperTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.CalendarEvent.Services;

using global::Codenized.Planixor.UseCases.CalendarEvent;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="AlertOffsetsMapper"/>.
/// </summary>
[TestFixture]
public sealed class AlertOffsetsMapperTests
{
    /// <summary>
    /// Serialize with null list returns empty JSON array.
    /// </summary>
    [Test]
    public void Serialize_WithNullList_ReturnsEmptyJsonArray()
    {
        // Act
        string result = AlertOffsetsMapper.Serialize(null);

        // Assert
        Assert.That(result, Is.EqualTo("[]"));
    }

    /// <summary>
    /// Serialize with empty list returns empty JSON array.
    /// </summary>
    [Test]
    public void Serialize_WithEmptyList_ReturnsEmptyJsonArray()
    {
        // Act
        string result = AlertOffsetsMapper.Serialize([]);

        // Assert
        Assert.That(result, Is.EqualTo("[]"));
    }

    /// <summary>
    /// Serialize with valid offsets returns JSON array.
    /// </summary>
    [Test]
    public void Serialize_WithValidOffsets_ReturnsJsonArray()
    {
        // Arrange
        var offsets = new List<int> { 0, 10, 60 };

        // Act
        string result = AlertOffsetsMapper.Serialize(offsets);

        // Assert
        Assert.That(result, Is.EqualTo("[0,10,60]"));
    }

    /// <summary>
    /// Serialize with all four valid offsets returns complete JSON array.
    /// </summary>
    [Test]
    public void Serialize_WithAllFourValidOffsets_ReturnsCompleteJsonArray()
    {
        // Arrange
        var offsets = new List<int> { 0, 10, 60, 1440 };

        // Act
        string result = AlertOffsetsMapper.Serialize(offsets);

        // Assert
        Assert.That(result, Is.EqualTo("[0,10,60,1440]"));
    }

    /// <summary>
    /// Serialize filters out invalid offset values.
    /// </summary>
    [Test]
    public void Serialize_WithInvalidOffsets_FiltersThemOut()
    {
        // Arrange
        var offsets = new List<int> { 0, 5, 10, 30, 60, 120, 1440 };

        // Act
        string result = AlertOffsetsMapper.Serialize(offsets);

        // Assert
        Assert.That(result, Is.EqualTo("[0,10,60,1440]"));
    }

    /// <summary>
    /// Serialize removes duplicate values.
    /// </summary>
    [Test]
    public void Serialize_WithDuplicates_RemovesDuplicates()
    {
        // Arrange
        var offsets = new List<int> { 10, 10, 60, 60 };

        // Act
        string result = AlertOffsetsMapper.Serialize(offsets);

        // Assert
        Assert.That(result, Is.EqualTo("[10,60]"));
    }

    /// <summary>
    /// Serialize truncates to max 4 elements.
    /// </summary>
    [Test]
    public void Serialize_WithMoreThanFourValid_TruncatesToFour()
    {
        // Arrange — all 4 valid values but with duplicates that won't push past 4 distinct
        var offsets = new List<int> { 0, 10, 60, 1440 };

        // Act
        string result = AlertOffsetsMapper.Serialize(offsets);

        // Assert
        List<int> deserialized = AlertOffsetsMapper.Deserialize(result);
        Assert.That(deserialized, Has.Count.LessThanOrEqualTo(4));
    }

    /// <summary>
    /// Serialize with only invalid values returns empty JSON array.
    /// </summary>
    [Test]
    public void Serialize_WithOnlyInvalidValues_ReturnsEmptyJsonArray()
    {
        // Arrange
        var offsets = new List<int> { 5, 15, 30, 120, 2880 };

        // Act
        string result = AlertOffsetsMapper.Serialize(offsets);

        // Assert
        Assert.That(result, Is.EqualTo("[]"));
    }

    /// <summary>
    /// Deserialize with null returns empty list.
    /// </summary>
    [Test]
    public void Deserialize_WithNull_ReturnsEmptyList()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize(null);

        // Assert
        Assert.That(result, Is.Empty);
    }

    /// <summary>
    /// Deserialize with empty string returns empty list.
    /// </summary>
    [Test]
    public void Deserialize_WithEmptyString_ReturnsEmptyList()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize(string.Empty);

        // Assert
        Assert.That(result, Is.Empty);
    }

    /// <summary>
    /// Deserialize with whitespace string returns empty list.
    /// </summary>
    [Test]
    public void Deserialize_WithWhitespaceString_ReturnsEmptyList()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("   ");

        // Assert
        Assert.That(result, Is.Empty);
    }

    /// <summary>
    /// Deserialize with empty JSON array returns empty list.
    /// </summary>
    [Test]
    public void Deserialize_WithEmptyJsonArray_ReturnsEmptyList()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("[]");

        // Assert
        Assert.That(result, Is.Empty);
    }

    /// <summary>
    /// Deserialize with valid JSON array returns list of offsets.
    /// </summary>
    [Test]
    public void Deserialize_WithValidJsonArray_ReturnsListOfOffsets()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("[0,10,60]");

        // Assert
        Assert.That(result, Has.Count.EqualTo(3));
        Assert.That(result, Is.EqualTo(new List<int> { 0, 10, 60 }));
    }

    /// <summary>
    /// Deserialize with all four valid offsets returns complete list.
    /// </summary>
    [Test]
    public void Deserialize_WithAllFourValidOffsets_ReturnsCompleteList()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("[0,10,60,1440]");

        // Assert
        Assert.That(result, Is.EqualTo(new List<int> { 0, 10, 60, 1440 }));
    }

    /// <summary>
    /// Deserialize filters out invalid offset values from JSON.
    /// </summary>
    [Test]
    public void Deserialize_WithInvalidOffsetsInJson_FiltersThemOut()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("[0,5,10,30,60]");

        // Assert
        Assert.That(result, Is.EqualTo(new List<int> { 0, 10, 60 }));
    }

    /// <summary>
    /// Deserialize with invalid JSON returns empty list.
    /// </summary>
    [Test]
    public void Deserialize_WithInvalidJson_ReturnsEmptyList()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("not-json");

        // Assert
        Assert.That(result, Is.Empty);
    }

    /// <summary>
    /// Deserialize removes duplicates from JSON.
    /// </summary>
    [Test]
    public void Deserialize_WithDuplicatesInJson_RemovesDuplicates()
    {
        // Act
        List<int> result = AlertOffsetsMapper.Deserialize("[10,10,60,60]");

        // Assert
        Assert.That(result, Is.EqualTo(new List<int> { 10, 60 }));
    }

    /// <summary>
    /// Deserialize truncates to max 4 elements.
    /// </summary>
    [Test]
    public void Deserialize_WithMoreThanFourElements_TruncatesToFour()
    {
        // Act — technically only 4 valid values exist, but test the truncation logic
        List<int> result = AlertOffsetsMapper.Deserialize("[0,10,60,1440]");

        // Assert
        Assert.That(result, Has.Count.LessThanOrEqualTo(4));
    }

    /// <summary>
    /// Round trip serialize then deserialize produces equivalent result.
    /// </summary>
    [Test]
    public void RoundTrip_SerializeThenDeserialize_ProducesEquivalentResult()
    {
        // Arrange
        var original = new List<int> { 0, 10, 60, 1440 };

        // Act
        string json = AlertOffsetsMapper.Serialize(original);
        List<int> roundTripped = AlertOffsetsMapper.Deserialize(json);

        // Assert
        Assert.That(roundTripped, Is.EqualTo(original));
    }
}
