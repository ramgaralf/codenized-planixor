package com.codenized.planixor.domain.backup

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for BackupValidator.
 *
 * Tests each validation error case and the happy path.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
class BackupValidatorTest {

    private lateinit var validator: BackupValidator

    private val validBackupJson = """
        {
            "metadata": {
                "createdAt": "2025-01-15T10:30:00Z",
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

    @Before
    fun setUp() {
        validator = BackupValidator()
    }

    // --- Requirement 6.1: File size validation ---

    @Test
    fun `validate should reject file exceeding 50 MB with FileTooLarge error`() {
        val fileSize = MAX_BACKUP_SIZE_BYTES + 1

        val result = validator.validate(validBackupJson, fileSize)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.FileTooLarge)
        assertEquals(50, (error as ValidationError.FileTooLarge).maxMb)
    }

    // --- Requirement 6.2: Invalid JSON ---

    @Test
    fun `validate should reject invalid JSON with InvalidJson error`() {
        val malformedJson = "{ this is not valid json }"

        val result = validator.validate(malformedJson, 100L)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.InvalidJson)
    }

    // --- Requirement 6.3: Schema validation ---

    @Test
    fun `validate should reject JSON missing metadata object with InvalidSchema error`() {
        val jsonWithoutMetadata = """
            {
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

        val result = validator.validate(jsonWithoutMetadata, 100L)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.InvalidSchema)
        assertEquals(listOf("metadata"), (error as ValidationError.InvalidSchema).missingFields)
    }

    @Test
    fun `validate should reject JSON with incomplete metadata fields`() {
        val jsonWithIncompleteMetadata = """
            {
                "metadata": {
                    "createdAt": "2025-01-15T10:30:00Z"
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

        val result = validator.validate(jsonWithIncompleteMetadata, 100L)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.InvalidSchema)
        val missingFields = (error as ValidationError.InvalidSchema).missingFields
        assertTrue(missingFields.contains("appVersion"))
        assertTrue(missingFields.contains("platform"))
        assertTrue(missingFields.contains("schemaVersion"))
        assertFalse(missingFields.contains("createdAt"))
    }

    @Test
    fun `validate should reject JSON missing data object with InvalidSchema error`() {
        val jsonWithoutData = """
            {
                "metadata": {
                    "createdAt": "2025-01-15T10:30:00Z",
                    "appVersion": "1.0.0",
                    "platform": "android",
                    "schemaVersion": 1
                }
            }
        """.trimIndent()

        val result = validator.validate(jsonWithoutData, 100L)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.InvalidSchema)
        assertEquals(listOf("data"), (error as ValidationError.InvalidSchema).missingFields)
    }

    @Test
    fun `validate should reject JSON with incomplete data entity arrays`() {
        val jsonWithIncompleteData = """
            {
                "metadata": {
                    "createdAt": "2025-01-15T10:30:00Z",
                    "appVersion": "1.0.0",
                    "platform": "android",
                    "schemaVersion": 1
                },
                "data": {
                    "calendarEvents": [],
                    "notificationRecords": []
                }
            }
        """.trimIndent()

        val result = validator.validate(jsonWithIncompleteData, 100L)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.InvalidSchema)
        val missingFields = (error as ValidationError.InvalidSchema).missingFields
        assertTrue(missingFields.contains("annualHoursConfig"))
        assertTrue(missingFields.contains("shifts"))
        assertTrue(missingFields.contains("reminders"))
        assertTrue(missingFields.contains("syncConfig"))
        assertFalse(missingFields.contains("calendarEvents"))
        assertFalse(missingFields.contains("notificationRecords"))
    }

    // --- Requirement 6.4: Version compatibility ---

    @Test
    fun `validate should reject incompatible schema version with IncompatibleVersion error`() {
        val jsonWithFutureVersion = """
            {
                "metadata": {
                    "createdAt": "2025-01-15T10:30:00Z",
                    "appVersion": "2.0.0",
                    "platform": "web",
                    "schemaVersion": 99
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

        val result = validator.validate(jsonWithFutureVersion, 100L)

        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as ValidationException).error
        assertTrue(error is ValidationError.IncompatibleVersion)
        assertEquals(99, (error as ValidationError.IncompatibleVersion).fileVersion)
        assertEquals(CURRENT_SCHEMA_VERSION, error.maxSupported)
    }

    // --- Happy path ---

    @Test
    fun `validate should accept valid backup with schemaVersion equal to current`() {
        val result = validator.validate(validBackupJson, 100L)

        assertTrue(result.isSuccess)
    }

    @Test
    fun `validate should return parsed BackupFile on success`() {
        val result = validator.validate(validBackupJson, 100L)

        assertTrue(result.isSuccess)
        val backupFile = result.getOrNull()!!
        assertEquals("2025-01-15T10:30:00Z", backupFile.metadata.createdAt)
        assertEquals("1.0.0", backupFile.metadata.appVersion)
        assertEquals("android", backupFile.metadata.platform)
        assertEquals(1, backupFile.metadata.schemaVersion)
        assertTrue(backupFile.data.calendarEvents.isEmpty())
        assertTrue(backupFile.data.notificationRecords.isEmpty())
        assertTrue(backupFile.data.annualHoursConfig.isEmpty())
        assertTrue(backupFile.data.shifts.isEmpty())
        assertTrue(backupFile.data.reminders.isEmpty())
        assertTrue(backupFile.data.syncConfig.isEmpty())
    }

    @Test
    fun `validate should accept file exactly at 50 MB size limit`() {
        val result = validator.validate(validBackupJson, MAX_BACKUP_SIZE_BYTES)

        assertTrue(result.isSuccess)
    }
}
