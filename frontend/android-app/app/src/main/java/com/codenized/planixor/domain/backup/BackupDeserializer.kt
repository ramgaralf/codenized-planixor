package com.codenized.planixor.domain.backup

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import javax.inject.Inject

/**
 * Deserializes a backup JSON string into a BackupFile domain model.
 * Configured to ignore unknown JSON fields for forward compatibility.
 *
 * Supports both the current named-key format and the legacy minified format
 * (single-letter keys: a, b, c, etc.) produced by earlier versions of the app.
 */
class BackupDeserializer @Inject constructor() {

    private val gson: Gson = GsonBuilder()
        .create()

    /**
     * Parses a JSON string into a BackupFile structure.
     * If the legacy minified format is detected (root has "a" and "b" keys instead
     * of "metadata" and "data"), it's automatically converted to the current format.
     * Unknown fields at any nesting level are silently ignored.
     *
     * @param json The raw JSON string from the backup file
     * @return Parsed BackupFile with all recognized fields populated
     * @throws com.google.gson.JsonSyntaxException if the JSON is malformed
     */
    fun deserialize(json: String): BackupFile {
        val root = JsonParser.parseString(json).asJsonObject

        // Detect legacy minified format (has "a" and "b" keys, no "metadata" key)
        if (root.has("a") && root.has("b") && !root.has("metadata")) {
            val converted = convertLegacyFormat(root)
            return gson.fromJson(converted, BackupFile::class.java)
        }

        return gson.fromJson(json, BackupFile::class.java)
    }

    /**
     * Converts legacy minified format to the current named-key format.
     *
     * Legacy key mapping:
     * - Root: a=metadata, b=data
     * - Metadata: a=createdAt
     * - Data: a=calendarEvents, b=notificationRecords, c=annualHoursConfig, d=shifts, e=reminders
     * - CalendarEvent: a=id, b=eventType, c=eventTypeId, d=startDay, e=endDay, f=startTime,
     *   g=endTime, h=totalHours, i=notes, j=alertOffsets, k=modifiedAt, l=syncedAt, m=isDeleted
     * - NotificationRecord: a=id, b=calendarEventId, c=alertOffset, d=triggerTime,
     *   e=isDelivered, f=isRead, g=modifiedAt, h=syncedAt, i=isDeleted
     * - AnnualHoursConfig: a=id, b=year, c=configuredHours, d=modifiedAt, e=syncedAt, f=isDeleted
     * - Shift: a=id, b=name, c=icon, d=backgroundColor, e=startTime, f=endTime,
     *   g=hoursWorked, h=isActive, i=createdAt, j=modifiedAt, k=syncedAt, l=isDeleted
     * - Reminder: a=id, b=name, c=icon, d=backgroundColor, e=isActive,
     *   f=createdAt, g=modifiedAt, h=syncedAt, i=isDeleted
     */
    private fun convertLegacyFormat(root: JsonObject): JsonObject {
        val legacyMeta = root.getAsJsonObject("a") ?: JsonObject()
        val legacyData = root.getAsJsonObject("b") ?: JsonObject()

        val result = JsonObject()

        // Metadata
        val metadata = JsonObject()
        metadata.addProperty("createdAt", legacyMeta.get("a")?.asString ?: "")
        metadata.addProperty("appVersion", "1.0.0")
        metadata.addProperty("platform", "web")
        metadata.addProperty("schemaVersion", 1)
        result.add("metadata", metadata)

        // Data
        val data = JsonObject()

        // Calendar events (data.a)
        val events = com.google.gson.JsonArray()
        legacyData.getAsJsonArray("a")?.forEach { element ->
            val e = element.asJsonObject
            val event = JsonObject()
            event.addProperty("id", e.get("a")?.asString ?: "")
            event.addProperty("eventType", e.get("b")?.asString ?: "")
            event.addProperty("eventTypeId", e.get("c")?.asString ?: "")
            event.addProperty("startDay", e.get("d")?.asString ?: "")
            event.addProperty("endDay", e.get("e")?.asString ?: "")
            event.addProperty("startTime", e.get("f")?.asInt ?: 0)
            event.addProperty("endTime", e.get("g")?.asInt ?: 0)
            event.addProperty("totalHours", e.get("h")?.asInt ?: 0)
            if (e.get("i")?.isJsonNull != false) event.add("notes", com.google.gson.JsonNull.INSTANCE)
            else event.addProperty("notes", e.get("i")?.asString)
            event.add("alertOffsets", e.getAsJsonArray("j") ?: com.google.gson.JsonArray())
            event.addProperty("modifiedAt", e.get("k")?.asString ?: "")
            if (e.get("l")?.isJsonNull != false) event.add("syncedAt", com.google.gson.JsonNull.INSTANCE)
            else event.addProperty("syncedAt", e.get("l")?.asString)
            event.addProperty("isDeleted", e.get("m")?.asBoolean ?: false)
            events.add(event)
        }
        data.add("calendarEvents", events)

        // Notification records (data.b)
        val notifications = com.google.gson.JsonArray()
        legacyData.getAsJsonArray("b")?.forEach { element ->
            val e = element.asJsonObject
            val record = JsonObject()
            record.addProperty("id", e.get("a")?.asString ?: "")
            record.addProperty("calendarEventId", e.get("b")?.asString ?: "")
            record.addProperty("alertOffset", e.get("c")?.asInt ?: 0)
            record.addProperty("triggerTime", e.get("d")?.asString ?: "")
            record.addProperty("isDelivered", e.get("e")?.asBoolean ?: false)
            record.addProperty("isRead", e.get("f")?.asBoolean ?: false)
            record.addProperty("modifiedAt", e.get("g")?.asString ?: "")
            if (e.get("h")?.isJsonNull != false) record.add("syncedAt", com.google.gson.JsonNull.INSTANCE)
            else record.addProperty("syncedAt", e.get("h")?.asString)
            record.addProperty("isDeleted", e.get("i")?.asBoolean ?: false)
            notifications.add(record)
        }
        data.add("notificationRecords", notifications)

        // Annual hours config (data.c)
        val annualHours = com.google.gson.JsonArray()
        legacyData.getAsJsonArray("c")?.forEach { element ->
            val e = element.asJsonObject
            val config = JsonObject()
            config.addProperty("id", e.get("a")?.asString ?: "")
            config.addProperty("year", e.get("b")?.asInt ?: 0)
            config.addProperty("configuredHours", e.get("c")?.asInt ?: 0)
            config.addProperty("modifiedAt", e.get("d")?.asString ?: "")
            if (e.get("e")?.isJsonNull != false) config.add("syncedAt", com.google.gson.JsonNull.INSTANCE)
            else config.addProperty("syncedAt", e.get("e")?.asString)
            config.addProperty("isDeleted", e.get("f")?.asBoolean ?: false)
            annualHours.add(config)
        }
        data.add("annualHoursConfig", annualHours)

        // Shifts (data.d)
        val shifts = com.google.gson.JsonArray()
        legacyData.getAsJsonArray("d")?.forEach { element ->
            val e = element.asJsonObject
            val shift = JsonObject()
            shift.addProperty("id", e.get("a")?.asString ?: "")
            shift.addProperty("name", e.get("b")?.asString ?: "")
            shift.addProperty("icon", e.get("c")?.asString ?: "")
            shift.addProperty("backgroundColor", e.get("d")?.asString ?: "")
            shift.addProperty("startTime", e.get("e")?.asInt ?: 0)
            shift.addProperty("endTime", e.get("f")?.asInt ?: 0)
            shift.addProperty("hoursWorked", e.get("g")?.asInt ?: 0)
            shift.addProperty("isActive", e.get("h")?.asBoolean ?: true)
            shift.addProperty("createdAt", e.get("i")?.asString ?: "")
            shift.addProperty("modifiedAt", e.get("j")?.asString ?: "")
            if (e.get("k")?.isJsonNull != false) shift.add("syncedAt", com.google.gson.JsonNull.INSTANCE)
            else shift.addProperty("syncedAt", e.get("k")?.asString)
            shift.addProperty("isDeleted", e.get("l")?.asBoolean ?: false)
            shifts.add(shift)
        }
        data.add("shifts", shifts)

        // Reminders (data.e)
        val reminders = com.google.gson.JsonArray()
        legacyData.getAsJsonArray("e")?.forEach { element ->
            val e = element.asJsonObject
            val reminder = JsonObject()
            reminder.addProperty("id", e.get("a")?.asString ?: "")
            reminder.addProperty("name", e.get("b")?.asString ?: "")
            reminder.addProperty("icon", e.get("c")?.asString ?: "")
            reminder.addProperty("backgroundColor", e.get("d")?.asString ?: "")
            reminder.addProperty("isActive", e.get("e")?.asBoolean ?: true)
            reminder.addProperty("createdAt", e.get("f")?.asString ?: "")
            reminder.addProperty("modifiedAt", e.get("g")?.asString ?: "")
            if (e.get("h")?.isJsonNull != false) reminder.add("syncedAt", com.google.gson.JsonNull.INSTANCE)
            else reminder.addProperty("syncedAt", e.get("h")?.asString)
            reminder.addProperty("isDeleted", e.get("i")?.asBoolean ?: false)
            reminders.add(reminder)
        }
        data.add("reminders", reminders)

        // Sync config (data.f) — pass through as empty if not present
        data.add("syncConfig", legacyData.getAsJsonArray("f") ?: com.google.gson.JsonArray())

        result.add("data", data)
        return result
    }
}
