package com.codenized.planixor.domain.backup

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonSyntaxException
import javax.inject.Inject

/**
 * Validates a backup file's content and size through a sequential pipeline.
 *
 * Checks (in order):
 * 1. File size <= 50 MB
 * 2. Valid JSON
 * 3. Metadata object with required fields (createdAt, appVersion, platform, schemaVersion)
 * 4. Data object with all six entity arrays
 * 5. Schema version <= current supported version
 *
 * Returns Result.success(BackupFile) on valid, Result.failure(ValidationException) on invalid.
 */
class BackupValidator @Inject constructor() {

    private val gson: Gson = GsonBuilder().create()

    /**
     * Validates the backup file content and size.
     *
     * @param content The raw JSON string content of the backup file
     * @param fileSize The file size in bytes
     * @return Result containing the parsed BackupFile on success, or a ValidationException wrapping a ValidationError on failure
     */
    fun validate(content: String, fileSize: Long): Result<BackupFile> {
        // 1. Size check
        if (fileSize > MAX_BACKUP_SIZE_BYTES) {
            return Result.failure(ValidationException(ValidationError.FileTooLarge(maxMb = 50)))
        }

        // 2. JSON parse (raw)
        val jsonObject: JsonObject = try {
            JsonParser.parseString(content).asJsonObject
        } catch (e: Exception) {
            return Result.failure(
                ValidationException(ValidationError.InvalidJson(details = e.message ?: "Invalid JSON")),
            )
        }

        // 3. Metadata validation
        val metadataElement = jsonObject.get("metadata")
        if (metadataElement == null || !metadataElement.isJsonObject) {
            return Result.failure(
                ValidationException(ValidationError.InvalidSchema(missingFields = listOf("metadata"))),
            )
        }

        val metadata = metadataElement.asJsonObject
        val missingMetadataFields = mutableListOf<String>()

        if (!metadata.has("createdAt") || !metadata.get("createdAt").isJsonPrimitive) {
            missingMetadataFields.add("createdAt")
        }
        if (!metadata.has("appVersion") || !metadata.get("appVersion").isJsonPrimitive) {
            missingMetadataFields.add("appVersion")
        }
        if (!metadata.has("platform") || !metadata.get("platform").isJsonPrimitive) {
            missingMetadataFields.add("platform")
        }
        if (!metadata.has("schemaVersion") || !metadata.get("schemaVersion").isJsonPrimitive) {
            missingMetadataFields.add("schemaVersion")
        }

        if (missingMetadataFields.isNotEmpty()) {
            return Result.failure(
                ValidationException(ValidationError.InvalidSchema(missingFields = missingMetadataFields)),
            )
        }

        // 4. Data arrays validation
        val dataElement = jsonObject.get("data")
        if (dataElement == null || !dataElement.isJsonObject) {
            return Result.failure(
                ValidationException(ValidationError.InvalidSchema(missingFields = listOf("data"))),
            )
        }

        val data = dataElement.asJsonObject
        val requiredArrays = listOf(
            "calendarEvents",
            "notificationRecords",
            "annualHoursConfig",
            "shifts",
            "reminders",
            "syncConfig",
        )
        val missingArrays = mutableListOf<String>()

        for (arrayName in requiredArrays) {
            val element = data.get(arrayName)
            if (element == null || !element.isJsonArray) {
                missingArrays.add(arrayName)
            }
        }

        if (missingArrays.isNotEmpty()) {
            return Result.failure(
                ValidationException(ValidationError.InvalidSchema(missingFields = missingArrays)),
            )
        }

        // 5. Version check
        val schemaVersion = metadata.get("schemaVersion").asInt
        if (schemaVersion > CURRENT_SCHEMA_VERSION) {
            return Result.failure(
                ValidationException(
                    ValidationError.IncompatibleVersion(
                        fileVersion = schemaVersion,
                        maxSupported = CURRENT_SCHEMA_VERSION,
                    ),
                ),
            )
        }

        // All checks passed — parse full BackupFile
        return try {
            val backupFile = gson.fromJson(content, BackupFile::class.java)
            Result.success(backupFile)
        } catch (e: JsonSyntaxException) {
            Result.failure(
                ValidationException(ValidationError.InvalidJson(details = e.message ?: "Parse error")),
            )
        }
    }
}

/**
 * Exception wrapper for ValidationError to be used with Kotlin's Result type.
 */
class ValidationException(val error: ValidationError) : Exception(
    when (error) {
        is ValidationError.FileTooLarge -> "File exceeds maximum size of ${error.maxMb} MB"
        is ValidationError.InvalidJson -> "Invalid JSON: ${error.details}"
        is ValidationError.InvalidSchema -> "Invalid schema: missing ${error.missingFields.joinToString()}"
        is ValidationError.IncompatibleVersion -> "Incompatible version: ${error.fileVersion} > ${error.maxSupported}"
    },
)
