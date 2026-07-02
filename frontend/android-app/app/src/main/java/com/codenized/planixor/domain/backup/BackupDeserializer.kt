package com.codenized.planixor.domain.backup

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import javax.inject.Inject

/**
 * Deserializes a backup JSON string into a BackupFile domain model.
 * Configured to ignore unknown JSON fields for forward compatibility.
 */
class BackupDeserializer @Inject constructor() {

    private val gson: Gson = GsonBuilder()
        .create()

    /**
     * Parses a JSON string into a BackupFile structure.
     * Unknown fields at any nesting level are silently ignored.
     *
     * @param json The raw JSON string from the backup file
     * @return Parsed BackupFile with all recognized fields populated
     * @throws com.google.gson.JsonSyntaxException if the JSON is malformed
     */
    fun deserialize(json: String): BackupFile {
        return gson.fromJson(json, BackupFile::class.java)
    }
}
