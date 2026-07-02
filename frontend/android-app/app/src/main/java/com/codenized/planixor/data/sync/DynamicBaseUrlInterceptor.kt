package com.codenized.planixor.data.sync

import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that dynamically replaces the base URL and adds the Authorization header
 * based on the current sync configuration. This allows Retrofit services to be created with
 * a placeholder base URL while the actual URL comes from user configuration at runtime.
 *
 * The interceptor also applies the configured [apiBasePath] between the host:port and
 * the endpoint-specific path. Retrofit services define paths starting with "api/" as a
 * placeholder segment which gets replaced by the configured base path at runtime.
 */
class DynamicBaseUrlInterceptor : Interceptor {

    @Volatile
    var serverUrl: String? = null

    @Volatile
    var apiKey: String? = null

    @Volatile
    var apiBasePath: String? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()

        val currentServerUrl = serverUrl
        val currentApiKey = apiKey

        if (currentServerUrl != null) {
            val newBaseUrl = currentServerUrl.trimEnd('/').toHttpUrlOrNull()
            if (newBaseUrl != null) {
                val originalUrl = request.url
                val effectiveBasePath = resolveBasePath()

                // Rebuild the path: replace the placeholder "api" prefix with the configured base path
                val originalPathSegments = originalUrl.pathSegments
                val pathAfterPlaceholder = if (originalPathSegments.isNotEmpty() &&
                    originalPathSegments[0] == "api"
                ) {
                    originalPathSegments.drop(1)
                } else {
                    originalPathSegments
                }

                // Construct new path segments from the effective base path + remaining path
                val basePathSegments = effectiveBasePath
                    .trim('/')
                    .split('/')
                    .filter { it.isNotEmpty() }

                val newPathSegments = basePathSegments + pathAfterPlaceholder

                val urlBuilder = originalUrl.newBuilder()
                    .scheme(newBaseUrl.scheme)
                    .host(newBaseUrl.host)
                    .port(newBaseUrl.port)

                // Clear existing path segments and set new ones
                // encodedPath sets the full path at once
                val newPath = "/" + newPathSegments.joinToString("/")
                urlBuilder.encodedPath(newPath)

                request = request.newBuilder()
                    .url(urlBuilder.build())
                    .build()
            }
        }

        if (currentApiKey != null) {
            request = request.newBuilder()
                .header("Authorization", "Bearer $currentApiKey")
                .build()
        }

        return chain.proceed(request)
    }

    private fun resolveBasePath(): String {
        val path = apiBasePath
        return if (path.isNullOrBlank()) "/api" else path
    }
}
