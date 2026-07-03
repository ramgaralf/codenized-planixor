package com.codenized.planixor.data.sync

import java.net.URI

/**
 * Result of parsing a server URL into its origin and API base path components.
 *
 * @property serverUrl The scheme + host + port (e.g., "https://backend.planixor.com")
 * @property apiBasePath The path segment (e.g., "/api") — defaults to "/api" if none provided
 */
data class ParsedUrl(
    val serverUrl: String,
    val apiBasePath: String,
)

/**
 * Represents a URL validation error with a key suitable for field-level error display.
 */
enum class UrlValidationError {
    MISSING_SCHEME,
    CONTAINS_WHITESPACE,
    INVALID_HOST,
}

/**
 * API Base Path Normalization and Validation Utilities.
 *
 * Pure functions for normalizing and validating the configurable API base path.
 * The base path is the URL segment appended after the server URL (e.g., "/api", "/custom/v2").
 *
 * Requirements: 4.6, 4.7, 4.10, 7.1, 14.1, 14.2, 14.3, 14.6
 */
object ApiBasePathUtils {

    private const val MAX_API_BASE_PATH_LENGTH = 128
    private const val DEFAULT_API_BASE_PATH = "/api"
    private val VALID_API_BASE_PATH_REGEX = Regex("^[a-zA-Z0-9\\-_./]+$")

    /**
     * Normalizes an API base path input string.
     *
     * Rules:
     * - Empty or whitespace-only input → returns "/api"
     * - Trims leading/trailing whitespace
     * - Prepends "/" if not already present
     * - Removes trailing "/" (unless the result would be just "/")
     *
     * @param input The raw API base path string from user input
     * @return The normalized API base path
     */
    fun normalizeApiBasePath(input: String): String {
        if (input.isBlank()) {
            return DEFAULT_API_BASE_PATH
        }

        var result = input.trim()

        if (!result.startsWith("/")) {
            result = "/$result"
        }

        if (result.endsWith("/") && result.length > 1) {
            result = result.dropLast(1)
        }

        return result
    }

    /**
     * Validates an API base path input string.
     *
     * Rules:
     * - Empty or blank input is valid (will be normalized to "/api" on save)
     * - Must be 128 characters or fewer (after trimming)
     * - Must contain only characters from [a-zA-Z0-9\-\_\.\/]
     * - Returns null if valid, or an error message string if invalid
     *
     * @param input The API base path string to validate
     * @return null if valid, or an error message if invalid
     */
    fun validateApiBasePath(input: String): String? {
        if (input.isBlank()) {
            return null
        }

        val trimmed = input.trim()

        if (trimmed.length > MAX_API_BASE_PATH_LENGTH) {
            return "API base path must be 128 characters or fewer"
        }

        if (!VALID_API_BASE_PATH_REGEX.matches(trimmed)) {
            return "API base path contains invalid characters. Only letters, numbers, hyphens, underscores, dots, and forward slashes are allowed"
        }

        return null
    }

    /**
     * Validates and parses a full server URL into its components with proper error handling.
     *
     * Validation rules:
     * - Must have https:// or http:// scheme
     * - Must not contain whitespace after trim
     * - Must parse to a valid host
     *
     * @param rawUrl The raw URL string from user input
     * @return Result.success with ParsedUrl on valid input, Result.failure with UrlValidationError otherwise
     */
    fun validateAndParseServerUrl(rawUrl: String): Result<ParsedUrl> {
        val trimmed = rawUrl.trim()

        // Reject if contains whitespace after trim
        if (trimmed.contains(Regex("\\s"))) {
            return Result.failure(UrlValidationException(UrlValidationError.CONTAINS_WHITESPACE))
        }

        // Reject if no scheme (https:// or http://)
        if (!trimmed.startsWith("https://", ignoreCase = true) &&
            !trimmed.startsWith("http://", ignoreCase = true)
        ) {
            return Result.failure(UrlValidationException(UrlValidationError.MISSING_SCHEME))
        }

        // Parse with java.net.URI
        val uri = try {
            URI(trimmed)
        } catch (_: Exception) {
            return Result.failure(UrlValidationException(UrlValidationError.INVALID_HOST))
        }

        // Reject if host is empty/null
        val host = uri.host
        if (host.isNullOrBlank()) {
            return Result.failure(UrlValidationException(UrlValidationError.INVALID_HOST))
        }

        // Extract scheme+host+port as serverUrl (no trailing slash)
        val scheme = uri.scheme
        val port = uri.port
        val serverUrl = if (port > 0) {
            "$scheme://$host:$port"
        } else {
            "$scheme://$host"
        }

        // Extract path as apiBasePath (default "/api" if empty or "/")
        val path = uri.path
        val apiBasePath = if (path.isNullOrBlank() || path == "/") {
            DEFAULT_API_BASE_PATH
        } else {
            if (path.endsWith("/") && path.length > 1) {
                path.dropLast(1)
            } else {
                path
            }
        }

        return Result.success(ParsedUrl(serverUrl = serverUrl, apiBasePath = apiBasePath))
    }

    /**
     * Parses a full server URL into its origin (scheme + host + port) and path components.
     * This is the legacy version without validation — kept for backward compatibility.
     *
     * Examples:
     * - "https://backend.planixor.com/api" → Pair("https://backend.planixor.com", "/api")
     * - "https://backend.planixor.com/custom/v2" → Pair("https://backend.planixor.com", "/custom/v2")
     * - "http://192.168.1.100:8080/api" → Pair("http://192.168.1.100:8080", "/api")
     * - "https://backend.planixor.com" → Pair("https://backend.planixor.com", "/api")
     *
     * If no path is provided (just the origin), defaults path to "/api".
     * Strips trailing slash from path.
     */
    fun parseServerUrl(input: String): Pair<String, String> {
        val trimmed = input.trim()

        val uri = try {
            URI(trimmed)
        } catch (_: Exception) {
            return Pair(trimmed, DEFAULT_API_BASE_PATH)
        }

        val scheme = uri.scheme ?: "https"
        val host = uri.host ?: return Pair(trimmed, DEFAULT_API_BASE_PATH)
        val port = uri.port

        val origin = if (port > 0) {
            "$scheme://$host:$port"
        } else {
            "$scheme://$host"
        }

        val path = uri.path
        val effectivePath = if (path.isNullOrBlank() || path == "/") {
            DEFAULT_API_BASE_PATH
        } else {
            if (path.endsWith("/") && path.length > 1) {
                path.dropLast(1)
            } else {
                path
            }
        }

        return Pair(origin, effectivePath)
    }

    /**
     * Reconstructs the full URL from serverUrl and apiBasePath for display.
     */
    fun buildFullServerUrl(serverUrl: String, apiBasePath: String): String {
        if (serverUrl.isBlank()) return ""
        val base = serverUrl.trimEnd('/')
        val path = if (apiBasePath.startsWith("/")) apiBasePath else "/$apiBasePath"
        return "$base$path"
    }
}

/**
 * Exception wrapping a [UrlValidationError] for use with Kotlin [Result].
 */
class UrlValidationException(val error: UrlValidationError) : Exception(error.name)
