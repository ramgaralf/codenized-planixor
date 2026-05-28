---
inclusion: fileMatch
fileMatchPattern: "frontend/android-app/**"
---

# App — Tech Stack (Android / Kotlin)

## Stack

- **Language:** Kotlin
- **Min SDK:** 26 (Android 8.0)
- **Target SDK:** 36 (Android 15)
- **Compile SDK:** 36
- **JVM Target:** 11
- **Build system:** Gradle 8.13 with Kotlin DSL
- **UI:** Jetpack Compose (Material Design 3) — no XML layouts
- **Architecture:** MVVM + Clean Architecture (single module, layer separation by package)
- **Networking:** Retrofit + OkHttp + Gson
- **Async:** Kotlin Coroutines + Flow — no RxJava
- **State:** StateFlow / SharedFlow — no LiveData in new code
- **DI:** Hilt (constructor injection preferred)
- **Image loading:** Coil Compose
- **Navigation:** Compose Navigation
- **Testing:** JUnit 4 + Espresso + Compose Testing

## Version catalog alignment (`gradle/libs.versions.toml`)

| Package | Version |
|---|---|
| Android Gradle Plugin (`agp`) | `8.12.*` |
| Kotlin | `2.0.*` |
| Compose BOM | `2024.09.00` |
| `androidx.core:core-ktx` | `1.17.*` |
| `androidx.lifecycle:lifecycle-runtime-ktx` | `2.10.*` |
| `androidx.lifecycle:lifecycle-viewmodel-ktx` | `2.10.*` |
| `androidx.activity:activity-compose` | `1.12.*` |
| `androidx.compose.material3:material3` | via BOM |
| Retrofit | `2.11.*` |
| OkHttp logging interceptor | `4.12.*` |
| Gson | `2.11.*` |
| Kotlinx Coroutines | `1.10.*` |
| Coil Compose | `2.7.*` |
| JUnit | `4.13.*` |
| Espresso | `3.7.*` |

> All versions managed centrally in `gradle/libs.versions.toml`. Never hardcode versions in `build.gradle.kts`.
> Do not introduce new libraries without explicit permission.

## Kotlin conventions

- Functional style preferred — use `map`, `filter`, `let`, `also` where appropriate
- Use `sealed class` / `sealed interface` for UI state and result types
- Use `data class` for immutable state objects
- Prefer `val` over `var` — mutable state only in ViewModel via `MutableStateFlow`
- Use `StateFlow` for ViewModel → UI communication
- Collect flows in UI using `collectAsStateWithLifecycle()`
- No `LiveData` in new code

## Jetpack Compose conventions

- All UI is declarative Compose — no XML layouts
- Composables are stateless (except `remember` for UI-only state)
- Composables receive data and callbacks via parameters
- No business logic in Composables — delegate to ViewModel
- Use `@Preview` annotation for IDE previews
- Material Design 3 components via `androidx.compose.material3`
- Theme applied globally via `{Product}Theme` wrapper

## Gradle plugins

```kotlin
// Root build.gradle.kts
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}

// App build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}
```

## Common commands

```bash
./gradlew build                    # full build (debug + release)
./gradlew assembleDebug            # build debug APK
./gradlew assembleRelease          # build release APK
./gradlew installDebug             # build and install on device/emulator
./gradlew uninstallDebug           # uninstall from device/emulator
./gradlew test                     # run unit tests (JVM)
./gradlew testDebug                # run unit tests for debug variant
./gradlew connectedAndroidTest     # run instrumented tests (device required)
./gradlew clean                    # clean build artifacts
./gradlew lint                     # run lint analysis
./gradlew lintDebug                # lint for debug variant
```

### Running single tests

```bash
./gradlew test --tests ClassName.methodName
./gradlew connectedAndroidTest --tests ClassName.methodName
```

## Build configuration

```kotlin
android {
    namespace = "com.codenized.planixor"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.codenized.planixor"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
}
```

