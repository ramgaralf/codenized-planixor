---
inclusion: fileMatch
fileMatchPattern: "app/**"
---

# App — Tech Stack (Android/Kotlin)

- **Language:** Kotlin
- **Architecture:** MVVM with ViewModel + StateFlow
- **UI:** Jetpack Compose (preferred) or XML layouts
- **Networking:** Retrofit + OkHttp
- **DI:** Hilt
- **Async:** Coroutines + Flow — no RxJava
- **Navigation:** Navigation Component
- **Testing:** JUnit + Espresso + Turbine (for Flow testing)

## Conventions

- Use `StateFlow` / `SharedFlow` for ViewModel state — no `LiveData` in new code
- Collect flows in the UI using `repeatOnLifecycle`
- Use `sealed class` for UI state and result types
- Inject dependencies via constructor injection where possible — field injection only for Android framework classes
- Keep Gradle dependencies in `libs.versions.toml` (version catalog)

## Common Commands

```bash
./gradlew build                  # build
./gradlew test                   # unit tests
./gradlew connectedAndroidTest   # instrumented tests (device/emulator required)
./gradlew assembleDebug          # debug APK
./gradlew assembleRelease        # release APK
./gradlew lint                   # lint
```
