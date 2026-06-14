---
inclusion: fileMatch
fileMatchPattern: "frontend/android-app/**"
---

# App — Workflows Index

Operational workflows available for the Android app project.
Read this index first, then load the specific workflow document that matches the task.

| Trigger | Workflow | Description |
|---|---|---|
| "configure android-app project" / scaffold the app / creating the Android project structure | Create project scaffold | Set up Gradle, dependencies, base packages, theme, and MainActivity |
| "add screen {ScreenName}" / spec task defining a new screen | Add a new screen/feature | Create Screen, ViewModel, UiState, and wire navigation |
| "add entity {EntityName}" / spec task defining a new API entity | Add API integration for entity | Create DTO, Mapper, ApiService, Repository interface + impl |

## MANDATORY — Workflow loading rule

**BEFORE writing ANY code in `frontend/android-app/`, you MUST:**

1. Check if the task matches a trigger in the table above
2. If it matches → **STOP** and follow the workflow steps described in this document (or load the referenced document if one exists)
3. Follow the workflow step-by-step — it contains exact configuration, dependencies, and code patterns
4. **NEVER** create simplified or alternative implementations — the workflow documents are the source of truth

**Trigger matching for "Configure project":**
- Any spec task that creates `build.gradle.kts`, `settings.gradle.kts`, or scaffolds the Android project structure
- Any task that creates `MainActivity.kt`, `PlanixorApplication.kt`, theme files, or DI modules
- Keywords: "scaffold", "bootstrap", "configure project", "create android-app", "set up Android"

**If you skip following the workflow, the implementation WILL be wrong.**

## Preconditions

| Workflow | Requires |
|---|---|
| Configure project | Empty `frontend/android-app/` folder |
| Add screen | Project scaffolded with base structure and navigation |
| Add entity | Project scaffolded, Retrofit configured |

---

## Testing workflow

### Test types and placement

| Type | Tool | Location | Purpose |
|---|---|---|---|
| Unit (JVM) | JUnit 4 | `app/src/test/` | ViewModels, Repositories, Mappers, Use Cases |
| Instrumented | Espresso + Compose Testing | `app/src/androidTest/` | UI interactions, navigation flows |

### Test naming convention

```kotlin
@Test
fun `getShifts should return success when API responds with data`() { ... }

@Test
fun `getShifts should return NoInternet when connectivity is unavailable`() { ... }
```

Pattern: `{method} should {expected behavior} when {condition}`

### Testing best practices

- Test ViewModels by verifying UiState emissions
- Test Repositories by mocking ApiService and ConnectivityChecker
- Test Mappers with known input/output pairs
- Use `Turbine` for testing Flow emissions
- Mock dependencies — never make real network calls in unit tests
- Test all error paths (no internet, timeout, server error)

### What to test per layer

| Layer | What to test |
|---|---|
| Domain | Use case logic (if use cases exist) |
| Data | Repository error handling, mapper correctness |
| UI | ViewModel state transitions, composable rendering |

---

## Quality gate (must pass before commit)

```bash
# Build succeeds
./gradlew assembleDebug

# Unit tests pass
./gradlew testDebug

# Lint clean
./gradlew lintDebug
```

## Validation checklist (before finalizing any task)

```bash
# 1. Build compiles without errors
./gradlew assembleDebug

# 2. Unit tests pass
./gradlew testDebug

# 3. Lint has no errors (warnings acceptable for MVP)
./gradlew lintDebug

# 4. No hardcoded strings in Kotlin (check strings.xml)
# 5. All screens handle: loading, success, empty, error states
# 6. No network calls outside data/ layer
# 7. No business logic in Composables
```

---

## Adding a new screen (checklist)

1. Create feature package: `ui/{feature}/`
2. Create `{Feature}UiState.kt` — immutable data class with all screen states
3. Create `{Feature}ViewModel.kt` — exposes `StateFlow<{Feature}UiState>`
4. Create `{Feature}Screen.kt` — stateless composable observing ViewModel
5. Add route to `ui/navigation/AppNavigation.kt`
6. Create reusable components in `ui/components/` if needed
7. Write unit tests for ViewModel in `test/.../ui/{feature}/`

## Adding API integration (checklist)

1. Create DTO in `data/dto/{Entity}Dto.kt`
2. Create mapper in `data/mapper/{Entity}Mapper.kt`
3. Add endpoint to `data/network/{Entity}ApiService.kt`
4. Create domain model in `domain/model/{Entity}.kt`
5. Create repository interface in `domain/repository/{Entity}Repository.kt`
6. Create repository implementation in `data/repository/{Entity}RepositoryImpl.kt`
7. Register in Hilt module (`di/`)
8. Write unit tests for mapper and repository

