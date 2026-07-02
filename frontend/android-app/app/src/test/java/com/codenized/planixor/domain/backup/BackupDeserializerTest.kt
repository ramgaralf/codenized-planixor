package com.codenized.planixor.domain.backup

import com.google.gson.JsonSyntaxException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for BackupDeserializer.
 * Validates: Requirements 9.3, 9.6, 10.1, 10.2
 */
class BackupDeserializerTest {

    private val deserializer = BackupDeserializer()

    @Test
    fun `deserialize valid JSON with all entity types populates all fields correctly`() {
        val json = """
        {
          "metadata": {
            "createdAt": "2025-06-20T13:07:59.878Z",
            "appVersion": "1.0.0",
            "platform": "android",
            "schemaVersion": 1
          },
          "data": {
            "calendarEvents": [{
              "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
              "eventType": "shift",
              "eventTypeId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
              "startDay": "2025-06-20",
              "endDay": "2025-06-20",
              "startTime": 480,
              "endTime": 960,
              "totalHours": 480,
              "notes": "Morning shift notes",
              "alertOffsets": [0, 10, 60],
              "modifiedAt": "2025-06-20T10:00:00.000Z",
              "syncedAt": "2025-06-19T08:00:00.000Z",
              "isDeleted": false
            }],
            "notificationRecords": [{
              "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
              "calendarEventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
              "alertOffset": 10,
              "triggerTime": "2025-06-20T07:50:00.000Z",
              "isDelivered": true,
              "isRead": false,
              "modifiedAt": "2025-06-20T07:50:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "annualHoursConfig": [{
              "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
              "year": 2025,
              "configuredHours": 1800,
              "modifiedAt": "2025-01-01T00:00:00.000Z",
              "syncedAt": "2025-01-02T12:00:00.000Z",
              "isDeleted": false
            }],
            "shifts": [{
              "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
              "name": "Morning",
              "icon": "\u2600\uFE0F",
              "backgroundColor": "#10B981",
              "startTime": 480,
              "endTime": 960,
              "hoursWorked": 480,
              "isActive": true,
              "createdAt": "2025-01-15T09:00:00.000Z",
              "modifiedAt": "2025-06-18T14:30:00.000Z",
              "syncedAt": "2025-06-18T15:00:00.000Z",
              "isDeleted": false
            }],
            "reminders": [{
              "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
              "name": "Take Medicine",
              "icon": "\uD83D\uDC8A",
              "backgroundColor": "#2563EB",
              "isActive": true,
              "createdAt": "2025-02-01T08:00:00.000Z",
              "modifiedAt": "2025-06-19T16:00:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "syncConfig": [{
              "serverUrl": "https://api.planixor.com",
              "apiKey": "test-api-key-123",
              "username": "testuser",
              "apiBasePath": "/api",
              "syncIntervalMinutes": 5,
              "isPaused": false,
              "lastSyncedAt": "2025-06-20T12:00:00.000Z"
            }]
          }
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)

        // Metadata
        assertEquals("2025-06-20T13:07:59.878Z", result.metadata.createdAt)
        assertEquals("1.0.0", result.metadata.appVersion)
        assertEquals("android", result.metadata.platform)
        assertEquals(1, result.metadata.schemaVersion)

        // Calendar Events
        assertEquals(1, result.data.calendarEvents.size)
        val event = result.data.calendarEvents[0]
        assertEquals("a1b2c3d4-e5f6-7890-abcd-ef1234567890", event.id)
        assertEquals("shift", event.eventType)
        assertEquals("b2c3d4e5-f6a7-8901-bcde-f12345678901", event.eventTypeId)
        assertEquals("2025-06-20", event.startDay)
        assertEquals("2025-06-20", event.endDay)
        assertEquals(480, event.startTime)
        assertEquals(960, event.endTime)
        assertEquals(480, event.totalHours)
        assertEquals("Morning shift notes", event.notes)
        assertEquals(listOf(0, 10, 60), event.alertOffsets)
        assertEquals("2025-06-20T10:00:00.000Z", event.modifiedAt)
        assertEquals("2025-06-19T08:00:00.000Z", event.syncedAt)
        assertEquals(false, event.isDeleted)

        // Notification Records
        assertEquals(1, result.data.notificationRecords.size)
        val notification = result.data.notificationRecords[0]
        assertEquals("c3d4e5f6-a7b8-9012-cdef-123456789012", notification.id)
        assertEquals("a1b2c3d4-e5f6-7890-abcd-ef1234567890", notification.calendarEventId)
        assertEquals(10, notification.alertOffset)
        assertEquals("2025-06-20T07:50:00.000Z", notification.triggerTime)
        assertEquals(true, notification.isDelivered)
        assertEquals(false, notification.isRead)
        assertNull(notification.syncedAt)

        // Annual Hours Config
        assertEquals(1, result.data.annualHoursConfig.size)
        val config = result.data.annualHoursConfig[0]
        assertEquals("d4e5f6a7-b8c9-0123-defa-234567890123", config.id)
        assertEquals(2025, config.year)
        assertEquals(1800, config.configuredHours)

        // Shifts
        assertEquals(1, result.data.shifts.size)
        val shift = result.data.shifts[0]
        assertEquals("e5f6a7b8-c9d0-1234-efab-345678901234", shift.id)
        assertEquals("Morning", shift.name)
        assertEquals(480, shift.startTime)
        assertEquals(960, shift.endTime)
        assertEquals(480, shift.hoursWorked)
        assertEquals(true, shift.isActive)

        // Reminders
        assertEquals(1, result.data.reminders.size)
        val reminder = result.data.reminders[0]
        assertEquals("f6a7b8c9-d0e1-2345-fabc-456789012345", reminder.id)
        assertEquals("Take Medicine", reminder.name)
        assertEquals(true, reminder.isActive)
        assertNull(reminder.syncedAt)

        // Sync Config
        assertEquals(1, result.data.syncConfig.size)
        val syncConfig = result.data.syncConfig[0]
        assertEquals("https://api.planixor.com", syncConfig.serverUrl)
        assertEquals("test-api-key-123", syncConfig.apiKey)
        assertEquals("testuser", syncConfig.username)
        assertEquals("/api", syncConfig.apiBasePath)
        assertEquals(5, syncConfig.syncIntervalMinutes)
        assertEquals(false, syncConfig.isPaused)
        assertEquals("2025-06-20T12:00:00.000Z", syncConfig.lastSyncedAt)
    }

    @Test
    fun `deserialize ignores unknown fields gracefully`() {
        val json = """
        {
          "metadata": {
            "createdAt": "2025-06-20T13:07:59.878Z",
            "appVersion": "1.0.0",
            "platform": "web",
            "schemaVersion": 1,
            "unknownMetaField": "should be ignored",
            "extraNumber": 42
          },
          "data": {
            "calendarEvents": [],
            "notificationRecords": [],
            "annualHoursConfig": [],
            "shifts": [{
              "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
              "name": "Night",
              "icon": "\uD83C\uDF19",
              "backgroundColor": "#2563EB",
              "startTime": 1320,
              "endTime": 360,
              "hoursWorked": 480,
              "isActive": true,
              "createdAt": "2025-01-15T09:00:00.000Z",
              "modifiedAt": "2025-06-18T14:30:00.000Z",
              "syncedAt": null,
              "isDeleted": false,
              "unknownShiftField": "ignored",
              "futureFeatureFlag": true
            }],
            "reminders": [],
            "syncConfig": [],
            "unknownEntityArray": [{"foo": "bar"}]
          },
          "topLevelUnknown": "also ignored"
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)

        assertEquals("1.0.0", result.metadata.appVersion)
        assertEquals("web", result.metadata.platform)
        assertEquals(1, result.data.shifts.size)
        assertEquals("Night", result.data.shifts[0].name)
        assertEquals(1320, result.data.shifts[0].startTime)
        assertEquals(360, result.data.shifts[0].endTime)
        assertNull(result.data.shifts[0].syncedAt)
    }

    @Test
    fun `deserialize web-produced backup parses correctly`() {
        val json = """
        {
          "metadata": {
            "createdAt": "2025-06-20T08:30:00.000Z",
            "appVersion": "1.2.0",
            "platform": "web",
            "schemaVersion": 1
          },
          "data": {
            "calendarEvents": [{
              "id": "11111111-2222-3333-4444-555555555555",
              "eventType": "reminder",
              "eventTypeId": "66666666-7777-8888-9999-aaaaaaaaaaaa",
              "startDay": "2025-07-01",
              "endDay": "2025-07-01",
              "startTime": 540,
              "endTime": 600,
              "totalHours": 60,
              "notes": null,
              "alertOffsets": [5, 15],
              "modifiedAt": "2025-06-20T08:00:00.000Z",
              "syncedAt": "2025-06-20T08:15:00.000Z",
              "isDeleted": false
            }],
            "notificationRecords": [],
            "annualHoursConfig": [],
            "shifts": [],
            "reminders": [{
              "id": "66666666-7777-8888-9999-aaaaaaaaaaaa",
              "name": "Team Meeting",
              "icon": "\uD83D\uDCBC",
              "backgroundColor": "#7C3AED",
              "isActive": true,
              "createdAt": "2025-03-10T11:00:00.000Z",
              "modifiedAt": "2025-06-15T09:00:00.000Z",
              "syncedAt": "2025-06-15T10:00:00.000Z",
              "isDeleted": false
            }],
            "syncConfig": []
          }
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)

        assertEquals("web", result.metadata.platform)
        assertEquals("1.2.0", result.metadata.appVersion)
        assertEquals(1, result.data.calendarEvents.size)
        assertEquals(1, result.data.reminders.size)
        assertEquals("reminder", result.data.calendarEvents[0].eventType)
        assertEquals("66666666-7777-8888-9999-aaaaaaaaaaaa", result.data.calendarEvents[0].eventTypeId)
        assertNull(result.data.calendarEvents[0].notes)
        assertEquals(listOf(5, 15), result.data.calendarEvents[0].alertOffsets)
    }

    @Test
    fun `deserialize preserves nullable fields as null`() {
        val json = """
        {
          "metadata": {
            "createdAt": "2025-06-20T13:07:59.878Z",
            "appVersion": "1.0.0",
            "platform": "android",
            "schemaVersion": 1
          },
          "data": {
            "calendarEvents": [{
              "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              "eventType": "shift",
              "eventTypeId": "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
              "startDay": "2025-06-20",
              "endDay": "2025-06-20",
              "startTime": 480,
              "endTime": 960,
              "totalHours": 480,
              "notes": null,
              "alertOffsets": [],
              "modifiedAt": "2025-06-20T10:00:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "notificationRecords": [{
              "id": "cccccccc-dddd-eeee-ffff-111111111111",
              "calendarEventId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              "alertOffset": 0,
              "triggerTime": "2025-06-20T08:00:00.000Z",
              "isDelivered": false,
              "isRead": false,
              "modifiedAt": "2025-06-20T08:00:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "annualHoursConfig": [{
              "id": "dddddddd-eeee-ffff-1111-222222222222",
              "year": 2025,
              "configuredHours": 1600,
              "modifiedAt": "2025-01-01T00:00:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "shifts": [{
              "id": "eeeeeeee-ffff-1111-2222-333333333333",
              "name": "Afternoon",
              "icon": "\uD83C\uDF05",
              "backgroundColor": "#7C3AED",
              "startTime": 840,
              "endTime": 1200,
              "hoursWorked": 360,
              "isActive": false,
              "createdAt": "2025-03-01T12:00:00.000Z",
              "modifiedAt": "2025-06-10T18:00:00.000Z",
              "syncedAt": null,
              "isDeleted": true
            }],
            "reminders": [{
              "id": "ffffffff-1111-2222-3333-444444444444",
              "name": "Water Plants",
              "icon": "\uD83C\uDF31",
              "backgroundColor": "#10B981",
              "isActive": false,
              "createdAt": "2025-04-01T06:00:00.000Z",
              "modifiedAt": "2025-06-12T20:00:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "syncConfig": [{
              "serverUrl": "https://sync.example.com",
              "apiKey": "key-abc",
              "username": "user1",
              "apiBasePath": "/api/v2",
              "syncIntervalMinutes": 15,
              "isPaused": true,
              "lastSyncedAt": null
            }]
          }
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)

        // Calendar event nullable fields
        assertNull(result.data.calendarEvents[0].notes)
        assertNull(result.data.calendarEvents[0].syncedAt)

        // Notification record nullable field
        assertNull(result.data.notificationRecords[0].syncedAt)

        // Annual hours config nullable field
        assertNull(result.data.annualHoursConfig[0].syncedAt)

        // Shift nullable field
        assertNull(result.data.shifts[0].syncedAt)
        assertEquals(true, result.data.shifts[0].isDeleted)

        // Reminder nullable field
        assertNull(result.data.reminders[0].syncedAt)

        // Sync config nullable field
        assertNull(result.data.syncConfig[0].lastSyncedAt)
    }

    @Test
    fun `deserialize handles empty entity arrays`() {
        val json = """
        {
          "metadata": {
            "createdAt": "2025-06-20T00:00:00.000Z",
            "appVersion": "1.0.0",
            "platform": "android",
            "schemaVersion": 1
          },
          "data": {
            "calendarEvents": [],
            "notificationRecords": [],
            "annualHoursConfig": [],
            "shifts": [],
            "reminders": [],
            "syncConfig": []
          }
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)

        assertTrue(result.data.calendarEvents.isEmpty())
        assertTrue(result.data.notificationRecords.isEmpty())
        assertTrue(result.data.annualHoursConfig.isEmpty())
        assertTrue(result.data.shifts.isEmpty())
        assertTrue(result.data.reminders.isEmpty())
        assertTrue(result.data.syncConfig.isEmpty())
        assertEquals(1, result.metadata.schemaVersion)
    }

    @Test(expected = JsonSyntaxException::class)
    fun `deserialize throws JsonSyntaxException on malformed JSON`() {
        val malformedJson = "{ this is not valid json }"
        deserializer.deserialize(malformedJson)
    }

    @Test
    fun `deserialize alertOffsets array correctly`() {
        val json = """
        {
          "metadata": {
            "createdAt": "2025-06-20T00:00:00.000Z",
            "appVersion": "1.0.0",
            "platform": "android",
            "schemaVersion": 1
          },
          "data": {
            "calendarEvents": [{
              "id": "12345678-1234-1234-1234-123456789abc",
              "eventType": "shift",
              "eventTypeId": "87654321-4321-4321-4321-cba987654321",
              "startDay": "2025-06-25",
              "endDay": "2025-06-25",
              "startTime": 600,
              "endTime": 1080,
              "totalHours": 480,
              "notes": "Test event",
              "alertOffsets": [0, 10, 60],
              "modifiedAt": "2025-06-25T09:00:00.000Z",
              "syncedAt": null,
              "isDeleted": false
            }],
            "notificationRecords": [],
            "annualHoursConfig": [],
            "shifts": [],
            "reminders": [],
            "syncConfig": []
          }
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)
        val event = result.data.calendarEvents[0]

        assertEquals(3, event.alertOffsets.size)
        assertEquals(0, event.alertOffsets[0])
        assertEquals(10, event.alertOffsets[1])
        assertEquals(60, event.alertOffsets[2])
    }

    @Test
    fun `deserialize preserves ISO 8601 date strings as-is without modification`() {
        val createdAt = "2025-06-20T13:07:59.878Z"
        val modifiedAt = "2025-06-18T14:30:00.000Z"
        val syncedAt = "2025-06-18T15:00:00.123Z"
        val triggerTime = "2025-06-20T07:50:00.500Z"

        val json = """
        {
          "metadata": {
            "createdAt": "$createdAt",
            "appVersion": "1.0.0",
            "platform": "android",
            "schemaVersion": 1
          },
          "data": {
            "calendarEvents": [{
              "id": "aabbccdd-1122-3344-5566-778899aabbcc",
              "eventType": "shift",
              "eventTypeId": "11223344-5566-7788-99aa-bbccddeeff00",
              "startDay": "2025-06-20",
              "endDay": "2025-06-20",
              "startTime": 480,
              "endTime": 960,
              "totalHours": 480,
              "notes": null,
              "alertOffsets": [],
              "modifiedAt": "$modifiedAt",
              "syncedAt": "$syncedAt",
              "isDeleted": false
            }],
            "notificationRecords": [{
              "id": "ddeeff00-1122-3344-5566-778899aabbcc",
              "calendarEventId": "aabbccdd-1122-3344-5566-778899aabbcc",
              "alertOffset": 10,
              "triggerTime": "$triggerTime",
              "isDelivered": false,
              "isRead": false,
              "modifiedAt": "$modifiedAt",
              "syncedAt": null,
              "isDeleted": false
            }],
            "annualHoursConfig": [],
            "shifts": [{
              "id": "11223344-5566-7788-99aa-bbccddeeff00",
              "name": "Test Shift",
              "icon": "\u2B50",
              "backgroundColor": "#EF4444",
              "startTime": 480,
              "endTime": 960,
              "hoursWorked": 480,
              "isActive": true,
              "createdAt": "$createdAt",
              "modifiedAt": "$modifiedAt",
              "syncedAt": "$syncedAt",
              "isDeleted": false
            }],
            "reminders": [],
            "syncConfig": []
          }
        }
        """.trimIndent()

        val result = deserializer.deserialize(json)

        // Metadata date preserved exactly
        assertEquals(createdAt, result.metadata.createdAt)

        // Calendar event dates preserved exactly
        assertEquals(modifiedAt, result.data.calendarEvents[0].modifiedAt)
        assertEquals(syncedAt, result.data.calendarEvents[0].syncedAt)

        // Notification record dates preserved exactly
        assertEquals(triggerTime, result.data.notificationRecords[0].triggerTime)
        assertEquals(modifiedAt, result.data.notificationRecords[0].modifiedAt)

        // Shift dates preserved exactly
        assertEquals(createdAt, result.data.shifts[0].createdAt)
        assertEquals(modifiedAt, result.data.shifts[0].modifiedAt)
        assertEquals(syncedAt, result.data.shifts[0].syncedAt)
    }
}
