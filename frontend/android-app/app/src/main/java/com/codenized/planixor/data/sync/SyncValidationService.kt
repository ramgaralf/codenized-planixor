package com.codenized.planixor.data.sync

/**
 * Validates sync server connectivity by checking credentials against the API.
 */
interface SyncValidationService {
    suspend fun validate(url: String, apiKey: String): ValidationResult
}
