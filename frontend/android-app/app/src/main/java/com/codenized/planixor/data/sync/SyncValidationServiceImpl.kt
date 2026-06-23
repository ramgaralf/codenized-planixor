package com.codenized.planixor.data.sync

import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * OkHttp-based implementation of [SyncValidationService].
 * Uses a dedicated OkHttpClient with a 10-second timeout since the URL is dynamic.
 */
class SyncValidationServiceImpl @Inject constructor(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(10, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build(),
) : SyncValidationService {

    private val gson = Gson()

    override suspend fun validate(url: String, apiKey: String): ValidationResult {
        if (url.isBlank() || apiKey.isBlank()) {
            return ValidationResult(success = false, error = "invalid_input")
        }

        return withContext(Dispatchers.IO) {
            try {
                val normalizedUrl = url.trimEnd('/')
                val request = Request.Builder()
                    .url("$normalizedUrl/api/security/validate")
                    .header("Authorization", "Bearer $apiKey")
                    .get()
                    .build()

                val response = client.newCall(request).execute()
                response.use { resp ->
                    when {
                        resp.isSuccessful -> {
                            val body = resp.body?.string()
                            val username = body?.let {
                                try {
                                    gson.fromJson(it, JsonObject::class.java)
                                        ?.get("username")?.asString
                                } catch (_: Exception) {
                                    null
                                }
                            }
                            ValidationResult(success = true, username = username)
                        }
                        resp.code == 401 || resp.code == 403 -> {
                            ValidationResult(success = false, error = "invalid_credentials")
                        }
                        resp.code == 404 -> {
                            ValidationResult(success = false, error = "not_found")
                        }
                        resp.code in 500..599 -> {
                            ValidationResult(success = false, error = "server_error")
                        }
                        else -> {
                            ValidationResult(success = false, error = "server_error")
                        }
                    }
                }
            } catch (_: IOException) {
                ValidationResult(success = false, error = "network_error")
            } catch (_: Exception) {
                ValidationResult(success = false, error = "network_error")
            }
        }
    }
}
