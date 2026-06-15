---
inclusion: fileMatch
fileMatchPattern: "frontend/android-app/**"
---

# App — Code Guidelines (Android / Kotlin)

Apply these rules when writing, reviewing, or refactoring any Kotlin code in `frontend/android-app/`.

---

## Kotlin style rules

### Naming

| Element | Convention | Example |
|---|---|---|
| Classes / objects | PascalCase | `ShiftListViewModel` |
| Functions | camelCase | `getShifts()`, `onShiftClicked()` |
| Properties / variables | camelCase | `shiftList`, `isLoading` |
| Constants (`const val`) | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `BASE_URL` |
| Companion object constants | UPPER_SNAKE_CASE | `companion object { const val TAG = "ShiftVM" }` |
| Packages | lowercase, no underscores | `com.codenized.planixor.ui.shifts` |
| Type parameters | Single uppercase letter or PascalCase | `T`, `Result` |
| Backing properties | Prefix with `_` | `private val _uiState` / `val uiState` |

### Prefer `val` over `var`

```kotlin
// ✅ Immutable
val shifts: List<Shift> = repository.getShifts()

// ❌ Mutable without reason
var shifts: List<Shift> = repository.getShifts()
```

### Data classes for state and DTOs

```kotlin
// ✅ Immutable data class
data class ShiftListUiState(
    val isLoading: Boolean = false,
    val shifts: List<Shift> = emptyList(),
    val error: String? = null,
)

// ❌ Mutable class with vars
class ShiftListUiState {
    var isLoading = false
    var shifts = mutableListOf<Shift>()
}
```

### Sealed classes for result types

```kotlin
// ✅ Exhaustive when handling
sealed class ShiftResult<out T> {
    data class Success<T>(val data: T) : ShiftResult<T>()
    data class Error(val message: String) : ShiftResult<Nothing>()
    data object NoInternet : ShiftResult<Nothing>()
}
```

### Extension functions

Use for mapping and transformation logic:

```kotlin
// ✅ Clean mapping
fun ShiftDto.toDomain(): Shift = Shift(
    id = this.id,
    startTime = this.startTime.toLocalDateTime(),
    endTime = this.endTime.toLocalDateTime(),
    status = ShiftStatus.valueOf(this.status),
)
```

---

## Composable conventions

### Stateless composables

```kotlin
// ✅ Receives data and callbacks via params
@Composable
fun ShiftCard(
    shift: Shift,
    onEditClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Text(text = shift.title)
        IconButton(onClick = { onEditClick(shift.id) }) {
            Icon(Icons.Default.Edit, contentDescription = "Edit shift")
        }
    }
}
```

### Modifier as last parameter

```kotlin
// ✅ Modifier with default value as last param
@Composable
fun ShiftCard(
    shift: Shift,
    onEditClick: (String) -> Unit,
    modifier: Modifier = Modifier,  // Always last, always with default
)
```

### Preview annotations

```kotlin
@Preview(showBackground = true)
@Composable
private fun ShiftCardPreview() {
    PlanixorTheme {
        ShiftCard(
            shift = previewShift,
            onEditClick = {},
        )
    }
}
```

### Content descriptions (accessibility)

```kotlin
// ✅ Meaningful content description
Icon(Icons.Default.Delete, contentDescription = "Delete shift")

// ✅ Decorative — null content description
Icon(Icons.Default.Circle, contentDescription = null)

// ❌ Empty string
Icon(Icons.Default.Delete, contentDescription = "")
```

---

## ViewModel conventions

### Single UiState per ViewModel

```kotlin
class ShiftListViewModel(
    private val repository: ShiftRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ShiftListUiState())
    val uiState: StateFlow<ShiftListUiState> = _uiState.asStateFlow()
}
```

### State updates via `update`

```kotlin
// ✅ Atomic update
_uiState.update { it.copy(isLoading = true) }

// ❌ Direct assignment (not thread-safe)
_uiState.value = _uiState.value.copy(isLoading = true)
```

### Coroutine scope

```kotlin
// ✅ Use viewModelScope
viewModelScope.launch {
    val result = repository.getShifts()
    // handle result
}

// ❌ GlobalScope
GlobalScope.launch { ... }
```

---

## Error handling

### Never crash the app

```kotlin
// ✅ Catch and map to UI state
try {
    val response = apiService.getShifts()
    // handle response
} catch (e: Exception) {
    ShiftResult.Error(e.message ?: "Unexpected error")
}

// ❌ Unhandled exception
val response = apiService.getShifts() // crashes on failure
```

### User-friendly error messages

```kotlin
// ✅ Human-readable
ShiftResult.Error("Unable to load shifts. Please check your connection.")

// ❌ Technical message exposed to user
ShiftResult.Error("java.net.SocketTimeoutException: timeout")
```

### UI must represent all states

Every screen must handle:
- Loading state
- Success state (with data)
- Empty state (no data)
- Error state (with retry option)

---

## Resource conventions

### Strings (i18n ready)

```xml
<!-- ✅ All user-facing text in strings.xml -->
<string name="shift_list_title">My Shifts</string>
<string name="error_no_internet">No internet connection</string>

<!-- values-es/strings.xml -->
<string name="shift_list_title">Mis Turnos</string>
<string name="error_no_internet">Sin conexión a internet</string>
```

- Never hardcode user-facing strings in Kotlin code
- Use `stringResource(R.string.key)` in Composables
- Support Spanish (`values-es/`) and English (`values/`) from day one

### Resource naming

| Type | Convention | Example |
|---|---|---|
| Strings | snake_case with prefix | `shift_list_title`, `error_no_internet` |
| Colors | snake_case | `primary_dark`, `surface_variant` |
| Drawables | snake_case with prefix | `ic_calendar`, `bg_shift_card` |
| Dimensions | snake_case with prefix | `margin_medium`, `text_size_title` |

## Navigation patterns for sub-screens (forms, detail views)

- Sub-screens (e.g., ShiftFormScreen) do NOT have their own Scaffold/TopAppBar
- The global AppNavigation Scaffold handles the top bar for ALL screens
- For sub-screens: the global top bar shows a back arrow (← ) + screen title (e.g., "Nuevo turno")
- The `isSubScreen` flag in AppNavigation determines when to show the back arrow vs the brand bar
- Bottom nav selection uses `bottomNavRoute` which maps sub-routes to their parent (e.g., `shifts/new` → `shifts`)
- Page title uses `startsWith` matching for sub-routes (e.g., `currentRoute?.startsWith("shifts")` → "Turnos")

## Touch targets (accessibility)

- Action buttons (edit, delete, toggle) must be minimum 44×44dp
- Icons inside action buttons: 20dp
- Gap between action buttons: 8dp minimum
- Color indicator strips on cards: 8dp wide

---

## Dependency injection

### Constructor injection (preferred)

```kotlin
// ✅ Constructor injection via Hilt
@HiltViewModel
class ShiftListViewModel @Inject constructor(
    private val repository: ShiftRepository,
) : ViewModel()
```

### Field injection (only for Android framework classes)

```kotlin
// ⚠️ Only when constructor injection is not possible
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var analytics: AnalyticsService
}
```

---

## Code quality rules

### No magic numbers or strings

```kotlin
// ❌ Magic values
if (retryCount > 3) { ... }
delay(2000)

// ✅ Named constants
companion object {
    private const val MAX_RETRIES = 3
    private const val RETRY_DELAY_MS = 2000L
}
```

### No commented-out code

```kotlin
// ❌ Dead code
// val oldShifts = repository.getOldShifts()

// ✅ Remove it. Git has history.
```

### No empty catch blocks

```kotlin
// ❌ Silent failure
try { ... } catch (e: Exception) { }

// ✅ At minimum, log the error
try { ... } catch (e: Exception) {
    Log.e(TAG, "Failed to load shifts", e)
    ShiftResult.Error("Failed to load shifts")
}
```

### Function length

- Prefer functions ≤ 30 lines
- If longer, extract sub-functions with descriptive names
- Composables: prefer ≤ 50 lines of content

---

## Inline comment rules

**Prohibited** (self-documenting code):
```kotlin
// Get shifts from repository    ← obvious
// Set loading to true           ← obvious
// TODO                          ← without ticket reference
```

**Allowed only when:**
- Explaining a non-obvious business rule
- Documenting a known Android/Compose workaround
- Referencing a ticket: `// TODO(PLAN-123): implement offline caching`

