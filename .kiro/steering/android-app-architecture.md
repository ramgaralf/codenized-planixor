---
inclusion: fileMatch
fileMatchPattern: "frontend/android-app/**"
---

# App — Architecture & Patterns (MVVM + Clean Architecture)

## Architecture overview

MVVM with Clean Architecture principles. Single Android module — layers separated by package, not by module.

```
┌─────────────────────────────────────────────────┐
│  UI Layer (ui/)                                  │
│  Composables → ViewModel → UiState              │
├─────────────────────────────────────────────────┤
│  Domain Layer (domain/)                          │
│  Models, Repository interfaces, Use Cases       │
├─────────────────────────────────────────────────┤
│  Data Layer (data/)                              │
│  Retrofit APIs, DTOs, Mappers, Repo impls       │
└─────────────────────────────────────────────────┘
```

Dependencies always point **inward**:
- `ui/` → `domain/` ✅
- `data/` → `domain/` ✅
- `domain/` → `data/` ❌ (never)
- `ui/` → `data/` ❌ (never — go through domain)

---

## Layer responsibilities

### Domain layer (`domain/`)

**Pure business logic. No Android dependencies.**

| Contains | Example |
|---|---|
| Domain models | `Shift.kt`, `ShiftStatus.kt` |
| Repository interfaces | `ShiftRepository.kt` |
| Use cases (only if justified) | `GetUpcomingShiftsUseCase.kt` |

Rules:
- No Retrofit, no Android SDK imports
- No state, no ViewModels
- Business logic lives here
- If a UseCase adds no value (just delegates to repository), skip it — no overengineering

### Data layer (`data/`)

**Fetching, transforming, and persisting data.**

| Contains | Example |
|---|---|
| Retrofit API interfaces | `ShiftApiService.kt` |
| DTOs (API response models) | `ShiftDto.kt` |
| Mappers (DTO → domain) | `ShiftMapper.kt` |
| Repository implementations | `ShiftRepositoryImpl.kt` |
| Connectivity checks | `ConnectivityChecker.kt` |

Rules:
- Retrofit is the ONLY networking solution
- All API calls MUST check internet availability BEFORE making the request
- All API calls MUST catch and map errors AFTER the request
- Repositories return a safe, controlled result — never raw exceptions
- No UI state or Compose references

### UI layer (`ui/`)

**Presentation — Jetpack Compose only.**

| Contains | Example |
|---|---|
| Screen composables | `ShiftListScreen.kt` |
| ViewModels (1 per screen) | `ShiftListViewModel.kt` |
| UI state (1 immutable per screen) | `ShiftListUiState.kt` |
| Reusable components | `ui/components/ShiftCard.kt` |
| Navigation | `ui/navigation/AppNavigation.kt` |
| Theme | `ui/theme/Theme.kt` |

Rules:
- No business logic in Composables
- No Retrofit or network logic
- UI observes state exposed by ViewModels
- ViewModels communicate with domain/data layers
- Errors represented as UI states (not just logs)

---

## MVVM state flow (mandatory)

```
Repository → ViewModel → Compose UI
```

Every screen has:
- 1 `ViewModel`
- 1 immutable `UiState` (data class)
- Composables that are stateless (except `remember` for UI-only state)

### UiState pattern

```kotlin
data class ShiftListUiState(
    val isLoading: Boolean = false,
    val shifts: List<Shift> = emptyList(),
    val error: String? = null,
)
```

### ViewModel pattern

```kotlin
class ShiftListViewModel(
    private val shiftRepository: ShiftRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ShiftListUiState())
    val uiState: StateFlow<ShiftListUiState> = _uiState.asStateFlow()

    init {
        loadShifts()
    }

    private fun loadShifts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = shiftRepository.getShifts()) {
                is ShiftResult.Success -> _uiState.update {
                    it.copy(isLoading = false, shifts = result.data)
                }
                is ShiftResult.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }
            }
        }
    }
}
```

### Screen composable pattern

```kotlin
@Composable
fun ShiftListScreen(viewModel: ShiftListViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when {
        uiState.isLoading -> LoadingIndicator()
        uiState.error != null -> ErrorMessage(uiState.error!!)
        uiState.shifts.isEmpty() -> EmptyState()
        else -> ShiftList(shifts = uiState.shifts)
    }
}
```

---

## Error handling contract

Repositories MUST return a safe result type:

```kotlin
sealed class ShiftResult<out T> {
    data class Success<T>(val data: T) : ShiftResult<T>()
    data class Error(val message: String) : ShiftResult<Nothing>()
    data object NoInternet : ShiftResult<Nothing>()
}
```

Rules:
- Do NOT throw raw exceptions to the UI
- All errors must be predictable and mappable to UI feedback
- Error messages shown in UI must be human-readable
- Errors must NEVER crash the app

---

## Networking & connectivity (mandatory)

### Before every network request:

1. Check internet availability via `ConnectivityChecker`
2. If no internet → return `Result.NoInternet` immediately

### After every network request:

Handle all failure cases:
- No internet → `NoInternet`
- Timeout → `Error("Connection timed out")`
- HTTP 4xx/5xx → `Error("Server error: {code}")`
- Unexpected exception → `Error("Unexpected error")`

### Repository implementation pattern

```kotlin
class ShiftRepositoryImpl(
    private val apiService: ShiftApiService,
    private val connectivityChecker: ConnectivityChecker,
    private val mapper: ShiftMapper,
) : ShiftRepository {

    override suspend fun getShifts(): ShiftResult<List<Shift>> {
        if (!connectivityChecker.isAvailable()) {
            return ShiftResult.NoInternet
        }
        return try {
            val response = apiService.getShifts()
            if (response.isSuccessful) {
                val shifts = response.body()?.map(mapper::toDomain) ?: emptyList()
                ShiftResult.Success(shifts)
            } else {
                ShiftResult.Error("Server error: ${response.code()}")
            }
        } catch (e: Exception) {
            ShiftResult.Error(e.message ?: "Unexpected error")
        }
    }
}
```

---

## Reusable components

**Location:** `ui/components/` (ALWAYS)

Rules:
- Reusable composables go in `ui/components/`, never inside a feature package
- If a composable is used by only one screen but is logically reusable (e.g., a card, a button variant), still place it in `ui/components/`
- Feature packages contain only Screen, ViewModel, and UiState

---

## Explicitly forbidden

| ❌ Forbidden | Why |
|---|---|
| Network calls in Composables | Violates layer separation |
| Network calls in ViewModels | Must go through Repository |
| Business logic in Composables | Belongs in domain/ViewModel |
| Skipping layers (UI → Data) | Always go through domain interfaces |
| Overengineering | No unnecessary abstractions, factories, or UseCases that just delegate |
| New libraries without permission | Must be approved first |
| XML layouts | Jetpack Compose only |
| LiveData | Use StateFlow/SharedFlow |
| RxJava | Use Coroutines + Flow |

---

## Activity-scoped ViewModels (shared state)

Some ViewModels need to be shared across multiple screens (e.g., `ThemeViewModel` controls the app-wide theme). These are scoped to the Activity and provided via `CompositionLocalProvider`:

```kotlin
// In MainActivity:
val LocalThemeViewModel = staticCompositionLocalOf<ThemeViewModel> { error("Not provided") }

CompositionLocalProvider(LocalThemeViewModel provides themeViewModel) {
    PlanixorTheme(themeMode = themeMode) { AppNavigation() }
}

// In any screen that needs it:
val themeViewModel = LocalThemeViewModel.current
```

Rules:
- Use Activity-scoped ViewModels (`by viewModels()`) only for truly app-wide state (theme, auth)
- Screen-specific ViewModels still use `hiltViewModel()` scoped to the NavBackStackEntry
- Never create duplicate instances of a shared ViewModel via `hiltViewModel()` in child screens

---

## Platform integration patterns

| Pattern | Implementation |
|---|---|
| Theme switching | `ThemeViewModel` at Activity scope → `PlanixorTheme(themeMode)` → immediate Compose recomposition |
| Language switching | `AppCompatDelegate.setApplicationLocales(LocaleListCompat)` — immediate, no restart |
| Activity base class | `AppCompatActivity` (required for `setApplicationLocales`) |
| Activity theme | `Theme.AppCompat.Light.NoActionBar` parent (required for AppCompatActivity) |

---

## Development philosophy

- **Simplicity > Cleverness** — prefer explicit, readable code
- **Clarity > Abstractions** — don't abstract until there's a clear need
- **Fast MVP + Good Practices** — professional code without academic over-architecture
- **Thin client** — all business logic lives in the backend API; the app handles presentation and API communication only

