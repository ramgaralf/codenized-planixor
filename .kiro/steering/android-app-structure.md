---
inclusion: fileMatch
fileMatchPattern: "frontend/android-app/**"
---

# App — Project Structure (Android / Kotlin / MVVM)

## Single-module layout with layer separation by package

```
frontend/android-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/codenized/planixor/
│   │   │   │   ├── domain/                          # Pure business logic (no Android SDK)
│   │   │   │   │   ├── model/                       # Domain models
│   │   │   │   │   │   └── {Entity}.kt
│   │   │   │   │   ├── repository/                  # Repository interfaces (contracts)
│   │   │   │   │   │   └── {Entity}Repository.kt
│   │   │   │   │   └── usecase/                     # Use cases (only if they add value)
│   │   │   │   │       └── Get{Entity}UseCase.kt
│   │   │   │   │
│   │   │   │   ├── data/                            # Data layer (networking, persistence)
│   │   │   │   │   ├── network/                     # Retrofit API interfaces
│   │   │   │   │   │   └── {Entity}ApiService.kt
│   │   │   │   │   ├── dto/                         # Data Transfer Objects (API models)
│   │   │   │   │   │   └── {Entity}Dto.kt
│   │   │   │   │   ├── mapper/                      # DTO → Domain model mappers
│   │   │   │   │   │   └── {Entity}Mapper.kt
│   │   │   │   │   ├── repository/                  # Repository implementations
│   │   │   │   │   │   └── {Entity}RepositoryImpl.kt
│   │   │   │   │   └── connectivity/                # Network availability checks
│   │   │   │   │       └── ConnectivityChecker.kt
│   │   │   │   │
│   │   │   │   ├── ui/                              # Presentation layer (Jetpack Compose)
│   │   │   │   │   ├── {feature}/                   # One package per screen/feature
│   │   │   │   │   │   ├── {Feature}Screen.kt      # Main composable (screen)
│   │   │   │   │   │   ├── {Feature}ViewModel.kt   # ViewModel (1 per screen)
│   │   │   │   │   │   └── {Feature}UiState.kt     # Immutable UI state data class
│   │   │   │   │   ├── components/                  # Reusable composable components
│   │   │   │   │   │   └── {ComponentName}.kt
│   │   │   │   │   ├── navigation/                  # Navigation graph and routes
│   │   │   │   │   │   └── AppNavigation.kt
│   │   │   │   │   └── theme/                       # Material 3 theming
│   │   │   │   │       ├── Color.kt
│   │   │   │   │       ├── Theme.kt
│   │   │   │   │       └── Type.kt
│   │   │   │   │
│   │   │   │   ├── di/                              # Dependency injection (Hilt modules)
│   │   │   │   │   └── {Module}Module.kt
│   │   │   │   │
│   │   │   │   └── MainActivity.kt                  # Single activity entry point
│   │   │   │
│   │   │   ├── res/
│   │   │   │   ├── values/                          # strings.xml, colors.xml, themes.xml
│   │   │   │   ├── values-es/                       # Spanish translations
│   │   │   │   └── drawable/                        # Vector drawables, icons
│   │   │   └── AndroidManifest.xml
│   │   │
│   │   ├── test/                                    # Unit tests (JVM)
│   │   │   └── java/com/codenized/planixor/
│   │   │       ├── domain/
│   │   │       ├── data/
│   │   │       └── ui/
│   │   │
│   │   └── androidTest/                             # Instrumented tests (device/emulator)
│   │       └── java/com/codenized/planixor/
│   │
│   ├── build.gradle.kts                             # App module configuration
│   └── proguard-rules.pro
│
├── gradle/
│   ├── libs.versions.toml                           # Centralized version catalog
│   └── wrapper/
├── build.gradle.kts                                 # Root build file (plugins only)
├── settings.gradle.kts
├── gradle.properties
├── gradlew / gradlew.bat
└── .gitignore
```

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Classes | PascalCase | `ShiftListViewModel`, `ShiftRepository` |
| Interfaces | PascalCase (no `I` prefix) | `ShiftRepository` (interface), `ShiftRepositoryImpl` (implementation) |
| Functions | camelCase | `getShifts()`, `calculateHours()` |
| Variables / parameters | camelCase | `shiftList`, `userId` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `BASE_URL` |
| Packages | lowercase, dot-separated | `com.codenized.planixor.ui.shifts` |
| Resource IDs | snake_case | `shift_list_item`, `btn_add_shift` |
| Resource files | snake_case | `ic_calendar.xml`, `bg_shift_card.xml` |
| Composables | PascalCase (like classes) | `ShiftCard()`, `ShiftListScreen()` |
| ViewModel state | PascalCase + `UiState` suffix | `ShiftListUiState` |
| Sealed classes (results) | PascalCase | `ShiftResult.Success`, `ShiftResult.Error` |
| Mappers | PascalCase + `Mapper` suffix | `ShiftMapper` |
| DTOs | PascalCase + `Dto` suffix | `ShiftDto`, `ShiftResponseDto` |
| API services | PascalCase + `ApiService` suffix | `ShiftApiService` |

## Key structural rules

- **Single module** — no multi-module architecture; layers separated by package only
- **Single Activity** — `MainActivity` is the only activity; navigation handled by Compose Navigation
- **One feature per package** under `ui/` — each screen gets its own folder with Screen, ViewModel, and UiState
- **Reusable components** go in `ui/components/` — never inside a feature package
- **Domain is pure Kotlin** — no Android SDK imports, no Retrofit, no state
- **Data layer owns networking** — all Retrofit interfaces, DTOs, and mappers live here
- **Tests mirror source structure** — `test/` for JVM unit tests, `androidTest/` for instrumented tests
- **Version catalog** — all dependency versions managed in `gradle/libs.versions.toml`
- **No XML layouts** — Jetpack Compose only for all UI

