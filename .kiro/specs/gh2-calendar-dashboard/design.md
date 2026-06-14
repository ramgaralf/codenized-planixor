# Design: Calendar Dashboard (Main Page)

## Overview

Technical design for the Calendar Dashboard — the main page of Planixor across React Web PWA and Android native app. This issue covers **UI shell and layout only** (navigation, calendar views, theme system, responsive layout). Data functionality (CRUD, charts with real data) will be implemented in subsequent issues. All screens render with empty states for now.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Web PWA (Vite + React + TypeScript)     │
│                                                                       │
│  ┌──────────┐  ┌────────────────────┐  ┌─────────────────────────┐ │
│  │ Sidebar  │  │   Calendar Main    │  │  Right Panel (Widgets)  │ │
│  │  5 items │  │  Day/Week/Month/   │  │  - Summary (empty)      │ │
│  │          │  │  Year views        │  │  - Bar Chart (empty)    │ │
│  │          │  │  + Header Bar      │  │  - Donut Chart (empty)  │ │
│  │          │  │  + View Selector   │  │  - Upcoming (empty)     │ │
│  └──────────┘  └────────────────────┘  └─────────────────────────┘ │
│                          │                                           │
│          ┌───────────────┼───────────────┐                          │
│          │               │               │                          │
│  ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼───────┐                  │
│  │  Zustand     │ │  React    │ │  Dexie.js    │                  │
│  │  (calendar   │ │  Context  │ │  (IndexedDB) │                  │
│  │   state)     │ │  (theme)  │ │  (data layer)│                  │
│  └──────────────┘ └───────────┘ └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Android App (Kotlin + Jetpack Compose + Hilt)  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CalendarScreen (Composable)                                    │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  TopAppBar: Logo + ViewSelector + DateNavigator          │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  CalendarContent (Month grid / Day timeline / Week /     │  │ │
│  │  │  Year mini-months)                                       │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  FAB (+)                                                 │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                            │
│              ┌──────────▼──────────┐                                │
│              │  ViewModels (Hilt)  │                                │
│              │  (Calendar, Theme)  │                                │
│              └──────────┬──────────┘                                │
│                         │                                            │
│              ┌──────────▼──────────┐                                │
│              │  Room DB + DataStore│                                │
│              └─────────────────────┘                                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Bottom Navigation Bar (5 items)                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### React Web PWA — Component Tree

```
<App>
└── <ThemeProvider>                    // React Context — manages theme state
    └── <I18nextProvider>              // i18n context
        └── <RouterProvider>           // react-router-dom
            └── <AppLayout>            // Responsive shell
                ├── <Sidebar>          // Fixed left nav (desktop/tablet)
                │   ├── <Logo />
                │   ├── <NavItem /> × 5 (Calendar, Shifts, Reminders, Reports, Settings)
                │   └── <UserProfile />
                ├── <MainContent>
                │   ├── <HeaderBar>
                │   │   ├── <NotificationBell />   // Stub — icon only, no functionality
                │   │   ├── <NewEventButton />     // Desktop/tablet only
                │   │   └── <UserAvatar />         // Always visible — account access
                │   ├── <ViewSelector />           // Day | Week | Month | Year
                │   ├── <DateNavigator />          // < label > + Today button
                │   └── <CalendarView>             // Switch on activeView
                │       ├── <DayView />            // 24h vertical timeline
                │       ├── <WeekView />           // 7-col grid + vertical timeline
                │       ├── <MonthView />          // Day grid (cells with events)
                │       └── <YearView />           // 12 mini-month grid
                ├── <RightPanel>                   // Desktop only (≥1024px)
                │   ├── <PeriodSummary />          // Hours + shifts count
                │   ├── <BarChart />               // Hours per subdivision
                │   ├── <DonutChart />             // Hours by shift type
                │   └── <UpcomingList />           // Events + shifts
                ├── <BottomNav />                  // Mobile only (<768px)
                └── <FAB />                        // Mobile only (<768px)
```

### Android App — Screen Structure (Jetpack Compose)

```
NavHost (Bottom Navigation — 5 items)
├── CalendarScreen
│   ├── TopAppBar (logo, view selector as segmented tabs, date nav arrows)
│   ├── CalendarContent
│   │   ├── DayTimeline (vertical 24h slots)
│   │   ├── WeekGrid (7-column layout + vertical timeline)
│   │   ├── MonthGrid (standard month calendar with event indicators)
│   │   └── YearOverview (12 mini-month grid)
│   └── FAB (+ icon, gradient)
├── ShiftsScreen (stub — placeholder)
├── RemindersScreen (stub — placeholder)
├── ReportsScreen
│   ├── TimeRangeSelector (Day/Week/Month/Year tabs)
│   ├── BarChart (hours per subdivision)
│   ├── DonutChart (hours by shift type)
│   └── UpcomingList (events + shifts)
└── SettingsScreen
    ├── ThemeSwitcher (Light / Dark / System)
    └── LanguageSwitcher (es / en)
```

### Key Interfaces

```typescript
// React Web — Zustand calendar store
interface CalendarState {
  activeView: 'day' | 'week' | 'month' | 'year';
  currentDate: Date;        // Anchor date for current view
  setView: (view: CalendarState['activeView']) => void;
  navigateForward: () => void;
  navigateBackward: () => void;
  goToToday: () => void;
}

// React Web — Theme context
interface ThemeContextValue {
  mode: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';  // Actual applied theme
  setMode: (mode: ThemeContextValue['mode']) => void;
}
```

```kotlin
// Android — ViewModels (injected via Hilt)
@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {
    val activeView: StateFlow<CalendarView>    // Day, Week, Month, Year
    val currentDate: StateFlow<LocalDate>

    fun navigateForward()
    fun navigateBackward()
    fun switchView(view: CalendarView)
    fun goToToday()
}

@HiltViewModel
class ThemeViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {
    val themeMode: StateFlow<ThemeMode>   // Light, Dark, System
    fun setTheme(mode: ThemeMode)
}
```

---

## Data Models

### CalendarEvent (Local Entity)

This entity will be used in future issues for data display. Defined here to establish the schema for the database setup in this issue.

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Client-generated unique identifier |
| `title` | `string` | Event title (user-facing) |
| `description` | `string?` | Optional description |
| `startAt` | `DateTime (UTC)` | Event start time |
| `endAt` | `DateTime (UTC)` | Event end time |
| `isAllDay` | `bool` | Whether this is an all-day event |
| `eventType` | `enum` | `ShiftMorning`, `ShiftAfternoon`, `ShiftNight`, `Personal`, `Meeting`, `Reminder` |
| `color` | `string?` | Override color hex (null = derived from eventType) |
| `modifiedAt` | `DateTime (UTC)` | Last local modification |
| `syncedAt` | `DateTime (UTC)?` | Last sync (null = never synced) |
| `isDeleted` | `bool` | Soft-delete flag |

> **Note**: The eventType enum covers both shifts and other calendar events. This is a single unified entity — all items displayed on the calendar are `CalendarEvent` records differentiated by `eventType`.

### User Preferences (Local Settings)

| Key | Type | Storage (Web) | Storage (Android) |
|---|---|---|---|
| `planixor_theme` | `'light' \| 'dark' \| 'system'` | LocalStorage | DataStore |
| `planixor_active_view` | `'day' \| 'week' \| 'month' \| 'year'` | LocalStorage | DataStore |
| `planixor_locale` | `'es' \| 'en'` | LocalStorage | DataStore |

---

## State Management — React Web

**Decision: Zustand for feature state + React Context for theme (Option B)**

| Concern | Tool | Rationale |
|---|---|---|
| Calendar state (activeView, currentDate) | **Zustand** | Selector-based reactivity — only re-renders components that read the specific slice that changed. Works outside React (testable). Minimal boilerplate. |
| Theme (mode, resolvedTheme) | **React Context** | Theme needs to wrap the entire tree to apply CSS variables via a provider. Context is the natural fit for "environment" state that affects rendering of all children. |
| Data (events, charts) | **Dexie live queries** | `useLiveQuery()` provides reactive subscriptions directly from IndexedDB. No need to duplicate data in a store — reads are already reactive. |
| i18n | **react-i18next** | Handles language switching, interpolation, and lazy loading of locale files. Standard in React ecosystem. |

### Persistence of activeView

The Zustand calendar store persists `activeView` to LocalStorage via the `persist` middleware. On app launch, the store hydrates from LocalStorage. If no value exists, defaults to `'week'`.

```typescript
// calendarStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      activeView: 'week',
      currentDate: new Date(),
      setView: (view) => set({ activeView: view }),
      navigateForward: () => set((state) => ({ currentDate: computeNext(state) })),
      navigateBackward: () => set((state) => ({ currentDate: computePrev(state) })),
      goToToday: () => set({ currentDate: new Date() }),
    }),
    {
      name: 'planixor_calendar',
      partialize: (state) => ({ activeView: state.activeView }), // Only persist view preference
    }
  )
);
```

---

## State Management — Android

| Concern | Tool | Rationale |
|---|---|---|
| Calendar state | **ViewModel + StateFlow** | Standard Compose pattern. Survives configuration changes. Injected via Hilt. |
| Theme | **ViewModel + DataStore** | DataStore for persistence, ViewModel exposes as StateFlow for Compose collection. |
| Active view persistence | **DataStore** | On app launch, ViewModel reads last saved view from DataStore. Defaults to `Week` if absent. |
| Data | **Room + Flow** | Room DAOs return `Flow<List<T>>` — Compose collects as state. |
| DI | **Hilt** | Standard Google-recommended DI for Android. `@HiltViewModel` for ViewModels, `@Inject` for repositories. |

---

## Theme System

### Web — CSS Custom Properties + CSS Modules

```css
/* tokens.css — CSS custom properties */
:root, .theme-light {
  --color-bg: #FFFFFF;
  --color-surface: #F3F4F6;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-primary: #2563EB;
  --color-accent: #7C3AED;
  --color-teal: #0B86D4;
  --color-green: #10B981;
}

.theme-dark {
  --color-bg: #0F172A;
  --color-surface: #1E293B;
  --color-text-primary: #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-primary: #2563EB;
  --color-accent: #7C3AED;
  --color-teal: #0B86D4;
  --color-green: #10B981;
}
```

ThemeProvider logic:
1. On mount: read `planixor_theme` from LocalStorage
2. If `'system'` or absent → evaluate `matchMedia('(prefers-color-scheme: dark)')`
3. Apply class `theme-light` or `theme-dark` to `<html>`
4. If mode is `'system'` → register `matchMedia` change listener
5. On user change → update LocalStorage + apply class immediately

Component styles use CSS Modules (`.module.css` files) that reference `var(--color-*)` tokens. This gives scoped class names with zero runtime overhead.

### Android — MaterialTheme Approach

```kotlin
@Composable
fun PlanixorTheme(
    themeMode: ThemeMode,
    content: @Composable () -> Unit
) {
    val darkTheme = when (themeMode) {
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
        ThemeMode.System -> isSystemInDarkTheme()
    }

    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = PlanixorTypography,  // Poppins-based
        content = content
    )
}
```

---

## Calendar Views Definition

### Day View
- **Layout**: Vertical timeline with 24 hourly slots (00:00–23:00)
- **Hour labels**: Left column showing formatted time (e.g., "9:00", "10:00")
- **Events**: Positioned as blocks spanning their duration within the timeline
- **Current time indicator**: Horizontal red/blue line at the current time (when viewing today)
- **This issue**: Renders empty timeline structure with hour labels, no events

### Week View
- **Layout**: 7-column grid with vertical timeline
- **Column headers**: Day name + date number (e.g., "Lun 12", "Mar 13")
- **Rows**: Hourly slots (same as Day View but spread across 7 columns)
- **Events**: Positioned as blocks in the corresponding day column and time slot
- **First day of week**: Depends on locale — Monday for `es`, Sunday for `en`
- **This issue**: Renders empty 7-column grid with day headers and hour labels

### Month View
- **Layout**: Day grid (7 columns × 5-6 rows depending on month)
- **Column headers**: Day abbreviations (L M X J V S D for `es` / S M T W T F S for `en`)
- **Cell content**: Day number + up to 2 event titles (truncated) + "+N más" if overflow
- **First day of week**: Depends on locale — Monday for `es`, Sunday for `en`
- **Current day**: Highlighted with `primary-blue` circle on day number
- **Days from adjacent months**: Shown in `text-secondary` color (dimmed)
- **This issue**: Renders grid with day numbers only, no events

### Year View
- **Layout**: Grid of 12 mini-month calendars
  - Desktop: 4 rows × 3 columns
  - Tablet: 3 rows × 4 columns
  - Mobile: 2 columns × 6 rows
- **Each mini-month**: Month name header + compact day grid (day numbers only, no events)
- **Dot indicators**: Small colored dots under days that have events (future issue — not in this issue)
- **Interactions**:
  - Tap day → navigate to Day View for that date
  - Tap month name → navigate to Month View for that month
- **Current day**: Highlighted with `primary-blue`
- **First day of week**: Depends on locale — Monday for `es`, Sunday for `en`
- **This issue**: Renders 12 mini-month grids with day numbers, current day highlighted

---

## Chart Library Selection

| Platform | Library | Rationale |
|---|---|---|
| React Web | **Recharts** | Declarative/composable API matches React patterns. Lightweight (~40kb gzipped). Built-in responsive container. Easy to style with CSS custom properties (brand colors). Better DX than Chart.js for React. |
| Android | **Vico** (`com.patrykandpatrick.vico:compose-m3`) | Compose-native — no Views/interop needed. Supports bar and donut/pie charts. Active maintenance. Material 3 integration. |

> Chart shift-type colors will be defined in a later issue when the actual data display is implemented. For now, charts render in empty state.

---

## Internationalization Strategy

### Web (React)
- Library: `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- Namespace: single `translation` namespace initially
- Files: `src/locales/es/translation.json`, `src/locales/en/translation.json`
- Date formatting: `Intl.DateTimeFormat` with the active locale
- Default: `es` (Spanish)
- Detection: browser locale on first visit, then persisted preference
- First day of week: derived from locale (`es` → Monday, `en` → Sunday)

### Android
- Standard Android resource strings: `res/values/strings.xml` (Spanish default), `res/values-en/strings.xml`
- Date formatting: `java.time.format.DateTimeFormatter` with locale
- Compose: `stringResource(R.string.key)`
- Detection: device locale on first launch, then persisted preference
- First day of week: `java.time.temporal.WeekFields.of(locale).firstDayOfWeek`

---

## Build Tooling — React Web

| Tool | Purpose |
|---|---|
| **Vite** | Bundler and dev server. Fast HMR, native TypeScript/CSS Modules support. |
| `vite-plugin-pwa` | Service Worker generation, PWA manifest, offline caching. |
| `vitest` | Unit and component testing (Vite-native, Jest-compatible API). |

Project created with `npm create vite@latest -- --template react-ts`.

---

## Styling Strategy — React Web

| Approach | Details |
|---|---|
| **CSS Modules** | Scoped class names per component (`.module.css` files). |
| **CSS Custom Properties** | Global design tokens in `tokens.css` (colors, spacing, typography). Theme switching by toggling class on `<html>`. |
| **No runtime CSS-in-JS** | Zero overhead at runtime — all styles resolved at build time by Vite. |

Example usage:
```typescript
// Sidebar.module.css
.sidebar { width: 240px; background: var(--color-bg); }
.navItem { color: var(--color-text-secondary); }
.navItem.active { color: var(--color-primary); }

// Sidebar.tsx
import styles from './Sidebar.module.css';
```

---

## Routing — React Web

| Route | Component | Description |
|---|---|---|
| `/` | `<CalendarDashboard />` | Default — Calendar view (all 4 sub-views live here) |
| `/shifts` | `<ShiftsPage />` | Stub placeholder |
| `/reminders` | `<RemindersPage />` | Stub placeholder |
| `/reports` | `<ReportsPage />` | Full reports page (empty state charts) |
| `/settings` | `<SettingsPage />` | Theme + language switcher |

---

## Responsive Layout — React Web

| Breakpoint | Sidebar | Right Panel | Navigation | FAB | HeaderBar Avatar |
|---|---|---|---|---|---|
| ≥1024px (Desktop) | Expanded (240px, icons + labels) | Visible | Sidebar | Hidden (use HeaderBar button) | Visible |
| 768–1023px (Tablet) | Collapsed (64px, icons only) | Hidden | Sidebar | Hidden (use HeaderBar button) | Visible |
| <768px (Mobile) | Hidden | Hidden | Bottom nav bar (5 items) | Visible (bottom-right) | Visible |

---

## Error Handling

| Scenario | Web Behavior | Android Behavior |
|---|---|---|
| IndexedDB/Room unavailable | Show error banner: "Unable to access local data" with retry option | Show Snackbar with retry action |
| Theme preference corrupted | Fall back to `system`, overwrite invalid value | Fall back to `System`, overwrite invalid value |
| Active view preference invalid | Fall back to `week` | Fall back to `Week` |
| Font (Poppins) fails to load | Fall back to system sans-serif stack (`system-ui, -apple-system, sans-serif`) | N/A (bundled in APK) |
| i18n translation key missing | Show key name as fallback (dev builds log warning) | Show key name as fallback |

---

## Testing Strategy

### React Web
- **Unit tests**: Vitest for Zustand store logic (navigation calculations, view switching, persistence)
- **Component tests**: Vitest + React Testing Library for Sidebar, ViewSelector, DateNavigator, ThemeProvider
- **Integration tests**: Theme persistence, i18n switching, responsive layout breakpoints
- **Visual regression**: Optional (Storybook + Chromatic) for component library

### Android
- **Unit tests**: JUnit5 + Turbine for ViewModel StateFlow assertions
- **UI tests**: Compose Testing for screen navigation, theme switching, view selector
- **Integration tests**: Room + ViewModel integration for data queries

---

## Dependencies (New)

### React Web PWA

| Package | Purpose |
|---|---|
| `react-router-dom` | Client-side routing |
| `zustand` | Feature state management (calendar) |
| `dexie` + `dexie-react-hooks` | IndexedDB wrapper with reactive queries |
| `react-i18next` + `i18next` + `i18next-browser-languagedetector` | Internationalization |
| `recharts` | Charts (bar + donut) |
| `lucide-react` | Icon set (outline style) |
| `@fontsource/poppins` | Self-hosted Poppins font |
| `vite-plugin-pwa` | PWA support (Service Worker, manifest) |

### Android App

| Dependency | Purpose |
|---|---|
| `com.google.dagger:hilt-android` + `hilt-compiler` | Dependency injection |
| `androidx.hilt:hilt-navigation-compose` | Hilt integration with Compose navigation |
| `androidx.navigation:navigation-compose` | Compose navigation |
| `androidx.datastore:datastore-preferences` | Preferences persistence |
| `androidx.room:room-runtime` + `room-ktx` + `room-compiler` | Local database |
| `com.patrykandpatrick.vico:compose-m3` | Compose charting |
| `androidx.compose.material3:material3` | Material 3 theming |

---

## File Structure

### React Web PWA (`frontend/react-web/`)

```
frontend/react-web/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                 // Entry point
    ├── app/
    │   ├── App.tsx
    │   ├── routes.tsx
    │   └── theme/
    │       ├── ThemeProvider.tsx
    │       ├── ThemeContext.ts
    │       ├── tokens.css       // CSS custom properties (colors, spacing, typography)
    │       └── global.css       // Reset + base styles
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── AppLayout.module.css
    │   │   ├── Sidebar.tsx
    │   │   ├── Sidebar.module.css
    │   │   ├── RightPanel.tsx
    │   │   ├── RightPanel.module.css
    │   │   ├── HeaderBar.tsx
    │   │   ├── HeaderBar.module.css
    │   │   ├── BottomNav.tsx
    │   │   └── BottomNav.module.css
    │   ├── calendar/
    │   │   ├── ViewSelector.tsx
    │   │   ├── ViewSelector.module.css
    │   │   ├── DateNavigator.tsx
    │   │   ├── DateNavigator.module.css
    │   │   ├── DayView.tsx
    │   │   ├── DayView.module.css
    │   │   ├── WeekView.tsx
    │   │   ├── WeekView.module.css
    │   │   ├── MonthView.tsx
    │   │   ├── MonthView.module.css
    │   │   ├── YearView.tsx
    │   │   └── YearView.module.css
    │   ├── widgets/
    │   │   ├── PeriodSummary.tsx
    │   │   ├── BarChart.tsx
    │   │   ├── DonutChart.tsx
    │   │   └── UpcomingList.tsx
    │   └── shared/
    │       ├── FAB.tsx
    │       ├── EventCard.tsx
    │       ├── NavItem.tsx
    │       └── EmptyState.tsx
    ├── data/
    │   ├── db.ts                // Dexie database definition
    │   └── models.ts           // TypeScript interfaces / types
    ├── stores/
    │   └── calendarStore.ts    // Zustand store (persisted activeView)
    ├── locales/
    │   ├── es/translation.json
    │   └── en/translation.json
    └── pages/
        ├── CalendarDashboard.tsx
        ├── ShiftsPage.tsx       // Stub
        ├── RemindersPage.tsx    // Stub
        ├── ReportsPage.tsx      // Empty state charts
        └── SettingsPage.tsx     // Theme + language switchers
```

### Android App (`frontend/android-app/app/src/main/java/com/codenized/planixor/`)

```
com/codenized/planixor/
├── PlanixorApplication.kt       // @HiltAndroidApp
├── MainActivity.kt              // @AndroidEntryPoint
├── di/
│   └── AppModule.kt            // Hilt module (provides Room DB, DataStore, etc.)
├── ui/
│   ├── theme/
│   │   ├── Theme.kt            // PlanixorTheme composable
│   │   ├── Color.kt            // Brand color constants
│   │   ├── Type.kt             // Poppins typography
│   │   └── ThemeViewModel.kt   // @HiltViewModel
│   ├── navigation/
│   │   ├── BottomNavBar.kt
│   │   ├── NavGraph.kt
│   │   └── Screen.kt           // Sealed class for routes
│   ├── calendar/
│   │   ├── CalendarScreen.kt
│   │   ├── CalendarViewModel.kt // @HiltViewModel
│   │   ├── ViewSelector.kt
│   │   ├── DateNavigator.kt
│   │   ├── DayView.kt
│   │   ├── WeekView.kt
│   │   ├── MonthView.kt
│   │   └── YearView.kt
│   ├── reports/
│   │   ├── ReportsScreen.kt
│   │   ├── ReportsViewModel.kt // @HiltViewModel
│   │   ├── BarChart.kt
│   │   └── DonutChart.kt
│   ├── settings/
│   │   └── SettingsScreen.kt
│   └── components/
│       ├── EventCard.kt
│       ├── FAB.kt
│       └── EmptyState.kt
├── data/
│   ├── local/
│   │   ├── PlanixorDatabase.kt
│   │   ├── CalendarEventEntity.kt
│   │   ├── CalendarEventDao.kt
│   │   └── PreferencesRepository.kt
│   └── repository/
│       └── EventRepository.kt
└── model/
    ├── CalendarEvent.kt
    ├── CalendarView.kt          // enum: Day, Week, Month, Year
    ├── EventType.kt             // enum: ShiftMorning, ShiftAfternoon, ShiftNight, Personal, Meeting, Reminder
    └── ThemeMode.kt             // enum: Light, Dark, System
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Calendar is `/` — no Home route | Reduces navigation; calendar is the primary view per product vision |
| Nav order: Calendar, Reports, Shifts, Reminders, Settings | Reports is the second most-accessed feature after Calendar |
| Both platforms have same 5 nav items in same order | Consistent UX across web and mobile |
| CalendarEvent as unified entity | Shifts, reminders, meetings are all calendar events differentiated by `eventType` — simpler schema, single query for display |
| Zustand (calendar) + Context (theme) | Zustand gives selector-based reactivity for feature state; Context is natural for tree-wide theme. Dexie handles data reactivity independently. |
| activeView persisted locally | User expects to return to their preferred view (e.g., someone who always uses Month view) |
| currentDate NOT persisted | Users expect "today" as starting point on each session |
| First day of week = locale-dependent | Monday for `es`, Sunday for `en` — respects cultural conventions |
| Year View = 12 mini-month grid | Matches user expectation (Google Calendar style); provides overview navigation |
| Vite as bundler | Fast dev/build, native TS + CSS Modules support, PWA plugin available |
| CSS Modules for styling | Scoped classes, zero runtime, pairs naturally with CSS custom properties for tokens |
| Recharts for Web | Declarative API, React-native, lightweight, easy theming via CSS vars |
| Vico for Android (bar chart only) | Compose-first, Material 3 support. Donut chart uses Canvas (Vico lacks pie/donut) |
| Hilt for Android DI | Google-recommended, `@HiltViewModel` pattern, type-safe |
| UI shell only in this issue | Allows building the complete layout without blocking on data layer features |
| No SearchInput in HeaderBar | Search functionality will be a separate issue; avoids unused UI clutter |
| NotificationBell as stub | Icon rendered visually but non-functional; functionality in a future issue |
| HeaderBar always shows UserAvatar | Standard pattern (Gmail, Notion); in mobile it's the only profile access point |
| No user profile in sidebar | User management exclusively via top bar avatar — cleaner sidebar |
| Logo in sidebar (web) + top bar (mobile/Android) | Brand presence consistent; adapts to available space |
| Stub pages for non-calendar sections | Navigation works end-to-end; actual content in dedicated issues |
| FAB opens stub/placeholder | Event creation flow will be a separate issue |
| No "empty state" text on calendar views | Empty grid is sufficient indication; text overlaps calendar structure |
| Android bottom nav: label only on active | Cleaner look with long localized labels; standard Material 3 pattern |
| ThemeViewModel shared at Activity scope (Android) | Single instance ensures theme change in Settings propagates to the entire app immediately |
| AppCompatActivity for MainActivity (Android) | Required for `AppCompatDelegate.setApplicationLocales()` to work |
| Theme parent = Theme.AppCompat.Light.NoActionBar | Required when using `AppCompatActivity`; android:Theme.Material causes crash |
| Page-level scroll disabled (web) | Sidebar + top bar stay fixed; only calendar content scrolls |
| Scrollbars themed (web) | Uses `--color-border` CSS var → adapts to light/dark automatically |
