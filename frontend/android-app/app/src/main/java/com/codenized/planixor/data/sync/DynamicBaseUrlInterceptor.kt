package com.codenized.planixor.data.sync

import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that dynamically replaces the base URL and adds the Authorization header
 * based on the current sync configuration. This allows Retrofit services to be created with
 * a placeholder base URL while the actual URL comes from user configuration at runtime.
 */
class DynamicBaseUrlInterceptor : Interceptor {

    @Volatile
    var serverUrl: String? = null

    @Volatile
    var apiKey: String? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()

        val currentServerUrl = serverUrl
        val currentApiKey = apiKey

        if (currentServerUrl != null) {
            val newBaseUrl = currentServerUrl.trimEnd('/').toHttpUrlOrNull()
            if (newBaseUrl != null) {
                // Replace the host, port, and scheme from the original request with the dynamic one
                val originalUrl = request.url
                val newUrl = originalUrl.newBuilder()
                    .scheme(newBaseUrl.scheme)
                    .host(newBaseUrl.host)
                    .port(newBaseUrl.port)
                    .build()

                request = request.newBuilder()
                    .url(newUrl)
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
}
