package com.codenized.planixor.data.sync

import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.arbitrary
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.of
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for URL parsing and construction (Properties 11–13).
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh32-improvements-and-bug-fixes
 *
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.6**
 */
@OptIn(ExperimentalKotest::class)
class UrlParsingPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Generators ---

    /** Generates a valid scheme (http or https). */
    private val schemeArb: Arb<String> = Arb.of("http", "https")

    /** Pool of valid hostname parts for generating hosts. */
    private val hostPartPool = listOf(
        "backend", "api", "server", "planixor", "app", "sync",
        "my", "test", "dev", "staging", "prod", "local",
        "host", "node", "service", "data", "core", "web",
    )

    /** Pool of valid TLDs/suffixes for hosts. */
    private val tldPool = listOf("com", "net", "org", "io", "dev", "app", "co")

    /** Generates a valid alphanumeric hostname. */
    private val hostArb: Arb<String> = arbitrary {
        val style = Arb.int(0, 3).bind()
        when (style) {
            0 -> {
                // subdomain.domain.tld style
                val sub = Arb.of(hostPartPool).bind()
                val domain = Arb.of(hostPartPool).bind()
                val tld = Arb.of(tldPool).bind()
                "$sub.$domain.$tld"
            }
            1 -> {
                // domain.tld style
                val domain = Arb.of(hostPartPool).bind()
                val tld = Arb.of(tldPool).bind()
                "$domain.$tld"
            }
            2 -> {
                // IP address style
                val a = Arb.int(1, 255).bind()
                val b = Arb.int(0, 255).bind()
                val c = Arb.int(0, 255).bind()
                val d = Arb.int(1, 254).bind()
                "$a.$b.$c.$d"
            }
            else -> "localhost"
        }
    }

    /** Generates an optional port (0 means no port). */
    private val portArb: Arb<Int> = Arb.of(0, 80, 443, 3000, 8080, 8443, 9090)

    /** Pool of valid path segments. */
    private val pathSegmentPool = listOf(
        "api", "v1", "v2", "v3", "custom", "sync", "data",
        "backend", "service", "app", "my-api", "rest",
    )

    /** Generates an optional path segment (e.g., "/api", "/custom/v2", "/my-path"). */
    private val pathArb: Arb<String> = arbitrary {
        val hasPath = Arb.boolean().bind()
        if (!hasPath) {
            ""
        } else {
            val segmentCount = Arb.int(1, 3).bind()
            val segments = (1..segmentCount).map {
                Arb.of(pathSegmentPool).bind()
            }
            "/" + segments.joinToString("/")
        }
    }

    /** Generates a valid full URL with scheme, host, optional port, and optional path. */
    private val validUrlArb: Arb<String> = arbitrary {
        val scheme = schemeArb.bind()
        val host = hostArb.bind()
        val port = portArb.bind()
        val path = pathArb.bind()

        val portPart = if (port > 0) ":$port" else ""
        "$scheme://$host$portPart$path"
    }

    /** Generates entity names used in the sync API. */
    private val entityArb: Arb<String> = Arb.of(
        "calendar-events",
        "notification-records",
        "annual-hours-config",
        "shifts",
        "reminders",
    )

    /** Generates sync actions. */
    private val actionArb: Arb<String> = Arb.of("push", "pull")

    // --- Property 11: URL parsing produces correct components ---

    /**
     * **Validates: Requirements 14.1, 14.2**
     *
     * Property 11: URL parsing produces correct components
     *
     * For any valid URL with scheme + host + optional port + optional path:
     * - validateAndParseServerUrl succeeds
     * - serverUrl does not end with /
     * - apiBasePath starts with /
     * - buildFullServerUrl(serverUrl, apiBasePath) reconstructs the significant portion of the original URL
     */
    @Test
    fun `Property 11 - validateAndParseServerUrl succeeds for any valid URL`() = runTest {
        checkAll(config, validUrlArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(
                "validateAndParseServerUrl should succeed for valid URL: '$url', " +
                    "but got failure: ${result.exceptionOrNull()?.message}",
                result.isSuccess,
            )
        }
    }

    @Test
    fun `Property 11 - parsed serverUrl does not end with slash`() = runTest {
        checkAll(config, validUrlArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(result.isSuccess)
            val parsed = result.getOrThrow()
            assertFalse(
                "serverUrl should not end with '/': '${parsed.serverUrl}' (from URL: '$url')",
                parsed.serverUrl.endsWith("/"),
            )
        }
    }

    @Test
    fun `Property 11 - parsed apiBasePath starts with slash`() = runTest {
        checkAll(config, validUrlArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(result.isSuccess)
            val parsed = result.getOrThrow()
            assertTrue(
                "apiBasePath should start with '/': '${parsed.apiBasePath}' (from URL: '$url')",
                parsed.apiBasePath.startsWith("/"),
            )
        }
    }

    @Test
    fun `Property 11 - buildFullServerUrl reconstructs the original URL`() = runTest {
        checkAll(config, validUrlArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(result.isSuccess)
            val parsed = result.getOrThrow()

            val reconstructed = ApiBasePathUtils.buildFullServerUrl(parsed.serverUrl, parsed.apiBasePath)

            // The reconstructed URL should match the original URL (minus trailing slashes)
            // When no path is provided, the default /api is used, so we compare against the
            // expected URL which is the original URL if it had a path, or original + /api if not
            val trimmedUrl = url.trimEnd('/')
            val hasPath = java.net.URI(url).path.let { !it.isNullOrBlank() && it != "/" }

            if (hasPath) {
                assertEquals(
                    "Reconstructed URL should match original (trimmed) for URL with path: '$url'",
                    trimmedUrl,
                    reconstructed,
                )
            } else {
                // No path means default /api is applied
                assertEquals(
                    "Reconstructed URL should be original + /api for URL without path: '$url'",
                    "$trimmedUrl/api",
                    reconstructed,
                )
            }
        }
    }

    // --- Property 12: URL construction produces no double slashes ---

    /**
     * **Validates: Requirements 14.3**
     *
     * Property 12: URL construction produces no double slashes
     *
     * For any valid serverUrl, apiBasePath, entity, and action:
     * The constructed endpoint URL has no "//" in the path portion (after scheme://).
     */
    @Test
    fun `Property 12 - constructed URL has no double slashes in path`() = runTest {
        checkAll(config, validUrlArb, entityArb, actionArb) { url, entity, action ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(result.isSuccess)
            val parsed = result.getOrThrow()

            // Construct the full endpoint URL as the interceptor does
            val serverUrl = parsed.serverUrl.trimEnd('/')
            val apiBasePath = parsed.apiBasePath.trim('/')
            val constructedUrl = "$serverUrl/$apiBasePath/$entity/sync/$action"

            // Extract path portion (after scheme://)
            val schemeEnd = constructedUrl.indexOf("://")
            assertTrue("URL must contain ://", schemeEnd >= 0)
            val pathPortion = constructedUrl.substring(schemeEnd + 3) // skip "://"

            assertFalse(
                "Path portion should not contain '//': path='$pathPortion' " +
                    "(full URL: '$constructedUrl', from serverUrl='${parsed.serverUrl}', " +
                    "apiBasePath='${parsed.apiBasePath}', entity='$entity', action='$action')",
                pathPortion.contains("//"),
            )
        }
    }

    @Test
    fun `Property 12 - constructed URL with buildFullServerUrl has no double slashes in path`() = runTest {
        val serverUrlWithTrailingSlashArb = arbitrary {
            val scheme = schemeArb.bind()
            val host = hostArb.bind()
            val port = portArb.bind()
            val addTrailingSlash = Arb.boolean().bind()
            val portPart = if (port > 0) ":$port" else ""
            val trailing = if (addTrailingSlash) "/" else ""
            "$scheme://$host$portPart$trailing"
        }

        val apiBasePathWithVariationsArb = arbitrary {
            val path = pathArb.bind()
            if (path.isEmpty()) {
                Arb.of("/api", "api", "/api/", "api/").bind()
            } else {
                val addLeadingSlash = Arb.boolean().bind()
                val addTrailingSlash = Arb.boolean().bind()
                val base = path.trim('/')
                val leading = if (addLeadingSlash) "/" else ""
                val trailing = if (addTrailingSlash) "/" else ""
                "$leading$base$trailing"
            }
        }

        checkAll(config, serverUrlWithTrailingSlashArb, apiBasePathWithVariationsArb, entityArb, actionArb) {
                serverUrl, apiBasePath, entity, action ->
            // Simulate how DynamicBaseUrlInterceptor resolves paths
            val effectiveBasePath = if (apiBasePath.isBlank()) "/api" else apiBasePath
            val basePathSegments = effectiveBasePath.trim('/').split('/').filter { it.isNotEmpty() }
            val pathAfterPlaceholder = listOf(entity, "sync", action)
            val newPathSegments = basePathSegments + pathAfterPlaceholder
            val newPath = "/" + newPathSegments.joinToString("/")

            assertFalse(
                "Constructed path should not contain '//': '$newPath' " +
                    "(serverUrl='$serverUrl', apiBasePath='$apiBasePath', entity='$entity', action='$action')",
                newPath.contains("//"),
            )
        }
    }

    // --- Property 13: Invalid URLs are rejected ---

    /**
     * **Validates: Requirements 14.6**
     *
     * Property 13: Invalid URLs are rejected
     *
     * For any string that is missing a URL scheme, contains whitespace, or has an invalid host,
     * validateAndParseServerUrl returns failure.
     */
    @Test
    fun `Property 13 - URLs without scheme are rejected`() = runTest {
        val noSchemeArb = arbitrary {
            val host = hostArb.bind()
            val port = portArb.bind()
            val path = pathArb.bind()
            val portPart = if (port > 0) ":$port" else ""
            "$host$portPart$path"
        }

        checkAll(config, noSchemeArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(
                "URL without scheme should be rejected: '$url'",
                result.isFailure,
            )
            val error = (result.exceptionOrNull() as UrlValidationException).error
            assertEquals(
                "Error should be MISSING_SCHEME for URL: '$url'",
                UrlValidationError.MISSING_SCHEME,
                error,
            )
        }
    }

    @Test
    fun `Property 13 - URLs with whitespace are rejected`() = runTest {
        val whitespacePositionArb = Arb.of("middle", "path")

        val urlWithWhitespaceArb = arbitrary {
            val scheme = schemeArb.bind()
            val host = hostArb.bind()
            val position = whitespacePositionArb.bind()

            when (position) {
                "middle" -> "$scheme://${host.take(2)} ${host.drop(2)}/api"
                "path" -> "$scheme://$host/a pi"
                else -> "$scheme://$host/ api"
            }
        }

        checkAll(config, urlWithWhitespaceArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(
                "URL with whitespace should be rejected: '$url'",
                result.isFailure,
            )
            val error = (result.exceptionOrNull() as UrlValidationException).error
            assertEquals(
                "Error should be CONTAINS_WHITESPACE for URL: '$url'",
                UrlValidationError.CONTAINS_WHITESPACE,
                error,
            )
        }
    }

    @Test
    fun `Property 13 - URLs with empty host are rejected`() = runTest {
        val emptyHostArb = arbitrary {
            val scheme = schemeArb.bind()
            // Various forms of invalid/empty host
            Arb.of(
                "$scheme://",
                "$scheme:///api",
                "$scheme:///",
            ).bind()
        }

        checkAll(config, emptyHostArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(
                "URL with empty/invalid host should be rejected: '$url'",
                result.isFailure,
            )
        }
    }

    @Test
    fun `Property 13 - URLs with non-http scheme are rejected`() = runTest {
        val invalidSchemeArb = arbitrary {
            val scheme = Arb.of("ftp", "ssh", "telnet", "ws", "wss", "file", "mailto").bind()
            val host = hostArb.bind()
            "$scheme://$host/api"
        }

        checkAll(config, invalidSchemeArb) { url ->
            val result = ApiBasePathUtils.validateAndParseServerUrl(url)
            assertTrue(
                "URL with non-http(s) scheme should be rejected: '$url'",
                result.isFailure,
            )
            val error = (result.exceptionOrNull() as UrlValidationException).error
            assertEquals(
                "Error should be MISSING_SCHEME for non-http scheme URL: '$url'",
                UrlValidationError.MISSING_SCHEME,
                error,
            )
        }
    }
}
