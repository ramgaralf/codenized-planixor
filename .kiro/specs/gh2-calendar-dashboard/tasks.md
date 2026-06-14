# Implementation Plan: Calendar Dashboard (Main Page)

## Overview

Build the Calendar Dashboard UI shell and layout for both the React Web PWA and the Android native app. This covers navigation structure, calendar views (Day/Week/Month/Year), right analytics panel (web), reports screen (Android), three-state theme system, responsive layout, i18n, and offline-first data loading from local stores. All screens render with empty states — data functionality (CRUD, real chart data) will be in subsequent issues.

## Tasks

- [x] 1. React Web — Foundation and theme system
  - [x] 1.1 Set up design tokens, global styles, and Poppins font
    - Install `@fontsource/poppins` package
    - Create `src/app/theme/tokens.css` with CSS custom properties for all brand colors, spacing, and typography tokens (light and dark)
    - Create `src/app/theme/global.css` with CSS reset, base styles, Poppins font-face imports, and font-weight mappings (h1-h3 Bold 700, h4-h6 SemiBold 600, body Regular 400, labels Medium 500)
    - Include fallback font stack: `system-ui, -apple-system, sans-serif`
    - Import tokens.css and global.css in `main.tsx`
    - _Requirements: 11.1–11.9, 12.1–12.7_

  - [x] 1.2 Implement ThemeProvider with React Context (3-file split)
    - Create `src/context/ThemeContextValue.ts` — types (`ThemeMode`, `ThemeContextValue`) + `createContext`
    - Create `src/context/ThemeContext.tsx` — `ThemeProvider` component that reads `planixor_theme` from LocalStorage, evaluates `matchMedia('(prefers-color-scheme: dark)')` for system mode, applies `theme-light` or `theme-dark` class to `<html>`, registers `matchMedia` change listener when mode is `system`
    - Create `src/context/useTheme.ts` — `useTheme` hook for consuming theme context
    - Persist theme to LocalStorage within 100ms of change; fall back to `system` if value is missing/invalid
    - Ensure no flash of incorrect theme on load (read and apply before render)
    - _Requirements: 8.1–8.10, 9.1–9.5, 10.1–10.2_

  - [x] 1.3 Install dependencies and set up Zustand calendar store
    - Install `zustand`, `react-router-dom`, `dexie`, `dexie-react-hooks`, `recharts`, `lucide-react`
    - Create `src/stores/calendarStore.ts` with Zustand `persist` middleware
    - Implement `CalendarState` interface: `activeView`, `currentDate`, `setView`, `navigateForward`, `navigateBackward`, `goToToday`
    - Persist only `activeView` to LocalStorage (key: `planixor_calendar`); default to `'week'` if absent
    - `currentDate` always starts as `new Date()` (not persisted)
    - Navigation functions compute next/prev date based on activeView (day±1, week±7, month±1, year±1)
    - _Requirements: 4.1–4.5, 5.1–5.8_

  - [x] 1.4 Set up i18n with locale detection and persistence
    - Update `src/infrastructure/i18n/index.ts` to add browser language detector (`i18next-browser-languagedetector`)
    - Install `i18next-browser-languagedetector` package
    - Configure detection: check LocalStorage first, then browser language; default to `es` if unsupported
    - Persist selected locale to LocalStorage on change
    - Create initial translation keys in `es.json` and `en.json` for all navigation labels, view names, date labels, empty states, and UI text
    - _Requirements: 14.1–14.6_

  - [x] 1.5 Set up Dexie database schema and data models
    - Create `src/data/models.ts` with `CalendarEvent` TypeScript interface (id UUID, title, description, startAt, endAt, isAllDay, eventType enum, color, modifiedAt, syncedAt, isDeleted)
    - Create `src/data/db.ts` with Dexie database definition including `calendarEvents` table
    - Define indexes on `startAt`, `endAt`, `eventType`, `isDeleted`
    - _Requirements: 15.1–15.5, 17.1_

- [x] 2. React Web — Layout shell and navigation
  - [x] 2.1 Create AppLayout with responsive three-column structure
    - Create `src/components/layout/AppLayout.tsx` + `AppLayout.module.css`
    - Implement three-column grid: Sidebar (240px) | Main (flex) | RightPanel
    - Use CSS custom properties from tokens.css; apply `var(--color-bg)` for background
    - At ≥1024px: expanded sidebar + main + right panel (three-column)
    - At 768–1023px: collapsed sidebar (64px) + main (two-column), right panel hidden
    - At <768px: no sidebar, single column, bottom nav + FAB visible
    - Use CSS media queries for breakpoint transitions (no page reload required)
    - _Requirements: 16.1–16.4_

  - [x] 2.2 Implement Sidebar component
    - Create `src/components/layout/Sidebar.tsx` + `Sidebar.module.css`
    - Render 5 nav items in order: Calendar, Shifts, Reminders, Reports, Settings (using Lucide icons)
    - Active item highlighted with `primary-blue` (#2563EB)
    - Expanded mode (≥1024px): 240px width, icons + labels
    - Collapsed mode (768–1023px): 64px width, icons only
    - Hidden at <768px
    - User profile section at bottom-left: avatar, display name, role (or "Sign in" placeholder for anonymous)
    - Keyboard navigation: Tab through items, Enter/Space to activate, visible focus indicator (WCAG 2.1 AA)
    - No "Home" menu item
    - Use `react-router-dom` `NavLink` for active state
    - _Requirements: 1.2, 1.4, 2.1–2.7_

  - [x] 2.3 Implement BottomNav component (mobile)
    - Create `src/components/layout/BottomNav.tsx` + `BottomNav.module.css`
    - Render 5 items: Calendar, Shifts, Reminders, Reports, Settings (icons + labels)
    - Active item: `primary-blue` (#2563EB); inactive: `text-secondary` (#6B7280)
    - Visible only at <768px viewport
    - Fixed at bottom of viewport; minimum 48px height touch target
    - No "Home" menu item
    - _Requirements: 1.3, 1.5, 3.1–3.4, 16.3_

  - [x] 2.4 Implement HeaderBar component
    - Create `src/components/layout/HeaderBar.tsx` + `HeaderBar.module.css`
    - Render: NotificationBell icon (stub, non-functional), NewEventButton (desktop/tablet only, ≥768px), UserAvatar (always visible)
    - NewEventButton hidden at <768px (FAB takes its place)
    - _Requirements: 13.3_

  - [x] 2.5 Implement FAB component
    - Create `src/components/shared/FAB.tsx` + CSS module
    - Circular button, bottom-right positioning, "+" icon (white), gradient background (primary-blue → primary-purple)
    - Visible only at <768px viewport width
    - Hidden at ≥768px
    - Minimum touch target: 44×44px
    - Accessible label: "Create new event" (i18n key)
    - OnClick: stub/placeholder (event creation flow in future issue)
    - _Requirements: 13.1–13.6_

- [x] 3. React Web — Calendar views and navigation controls
  - [x] 3.1 Implement ViewSelector component
    - Create `src/components/calendar/ViewSelector.tsx` + `ViewSelector.module.css`
    - Four options: Day, Week, Month, Year as horizontal tabs above calendar area
    - Active view highlighted with `primary-blue` (#2563EB)
    - On selection: call `calendarStore.setView()` — transition within 300ms
    - All labels from i18n keys
    - _Requirements: 4.1, 4.3, 4.5, 4.6_

  - [x] 3.2 Implement DateNavigator component
    - Create `src/components/calendar/DateNavigator.tsx` + `DateNavigator.module.css`
    - Previous/Next arrow buttons + formatted date label + "Today" button
    - Date label format per view: Day = full date with weekday; Week = week number + year; Month = month name + year; Year = year
    - Navigation uses `calendarStore.navigateForward()` / `navigateBackward()`
    - Today button: `calendarStore.goToToday()` — visible and enabled in all views; no-op if already showing today's period
    - Date formatting respects active locale (`Intl.DateTimeFormat`)
    - _Requirements: 5.1–5.8_

  - [x] 3.3 Implement DayView component (empty shell)
    - Create `src/components/calendar/DayView.tsx` + `DayView.module.css`
    - Vertical timeline with 24 hourly slots (00:00–23:00)
    - Hour labels in left column, formatted per locale
    - Current time indicator (horizontal line) when viewing today
    - Empty state: no events rendered (data in future issue)
    - _Requirements: 17.3, 17.7_

  - [x] 3.4 Implement WeekView component (empty shell)
    - Create `src/components/calendar/WeekView.tsx` + `WeekView.module.css`
    - 7-column grid with vertical timeline
    - Column headers: day name + date number (localized)
    - First day of week: Monday for `es`, Sunday for `en` (derived from locale)
    - Hourly row slots (same as DayView but across 7 columns)
    - Empty state: no events rendered
    - _Requirements: 17.7_

  - [x] 3.5 Implement MonthView component (empty shell)
    - Create `src/components/calendar/MonthView.tsx` + `MonthView.module.css`
    - Day grid: 7 columns × 5-6 rows
    - Column headers: day abbreviations (locale-dependent)
    - Current day highlighted with `primary-blue` circle
    - Days from adjacent months shown in `text-secondary` color
    - First day of week locale-dependent
    - Empty state: day numbers only, no events
    - _Requirements: 17.7_

  - [x] 3.6 Implement YearView component (empty shell)
    - Create `src/components/calendar/YearView.tsx` + `YearView.module.css`
    - Grid of 12 mini-month calendars: Desktop 4×3, Tablet 3×4, Mobile 2×6
    - Each mini-month: month name header + compact day grid (day numbers only)
    - Current day highlighted with `primary-blue`
    - First day of week locale-dependent
    - Click month name → navigate to Month view; click day → navigate to Day view
    - Empty state: no event dots
    - _Requirements: 17.7_

- [x] 4. Checkpoint — React Web shell complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. React Web — Right panel, pages, and routing
  - [x] 5.1 Implement RightPanel with empty-state widgets
    - Create `src/components/layout/RightPanel.tsx` + `RightPanel.module.css`
    - Contains: PeriodSummary, BarChart, DonutChart, UpcomingList (all empty state)
    - Create `src/components/widgets/PeriodSummary.tsx` — shows "0 hours", "0 shifts" with i18n labels
    - Create `src/components/widgets/BarChart.tsx` — empty Recharts bar chart placeholder with brand colors
    - Create `src/components/widgets/DonutChart.tsx` — empty Recharts donut chart placeholder with brand colors
    - Create `src/components/widgets/UpcomingList.tsx` — empty state message "No upcoming events"
    - Visible only at ≥1024px viewport
    - Panel adapts label to activeView (reads from calendarStore)
    - Chart colors: only brand palette (#2563EB, #7C3AED, #0B86D4, #10B981)
    - _Requirements: 6.1–6.12_

  - [x] 5.2 Set up React Router and page components
    - Install `react-router-dom` (if not done in 1.3)
    - Create `src/app/routes.tsx` with route definitions
    - Create page components: `CalendarDashboard.tsx` (default `/`), `ShiftsPage.tsx` (stub), `RemindersPage.tsx` (stub), `ReportsPage.tsx`, `SettingsPage.tsx`
    - CalendarDashboard composes: HeaderBar + ViewSelector + DateNavigator + CalendarView (switches on activeView)
    - Calendar is the default route (`/`) — no separate "Home" route
    - Wrap routes in ThemeProvider and I18nextProvider
    - _Requirements: 1.1, 1.6_

  - [x] 5.3 Implement ReportsPage (web)
    - Create `src/pages/ReportsPage.tsx`
    - Full-page reports with empty-state charts (reuse widget components or create page-specific versions)
    - Time-range selector (Day/Week/Month/Year), bar chart, donut chart, events list
    - All empty state with i18n "no data" messages
    - _Requirements: 7.1–7.9 (adapted for web)_

  - [x] 5.4 Implement SettingsPage with theme and language switchers
    - Create `src/pages/SettingsPage.tsx`
    - Theme switcher: 3 options (Light, Dark, System) — calls `useTheme().setMode()`
    - Language switcher: 2 options (Español, English) — calls `i18n.changeLanguage()`
    - Persist selections immediately
    - _Requirements: 8.1–8.8, 9.1–9.5, 14.3, 14.5_

- [x] 6. Checkpoint — React Web feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Android — Foundation, theme, and data layer
  - [x] 7.1 Add new dependencies to build.gradle.kts
    - Add Room dependencies (`androidx.room:room-runtime`, `room-ktx`, `room-compiler` via KSP)
    - Add DataStore (`androidx.datastore:datastore-preferences`)
    - Add Vico charting library (`com.patrykandpatrick.vico:compose-m3`)
    - Update `gradle/libs.versions.toml` with version entries
    - _Requirements: 15.1–15.5_

  - [x] 7.2 Implement brand colors and Poppins typography
    - Update `ui/theme/Color.kt` with all brand color constants (primaryBlue, primaryPurple, accentTeal, accentGreen, surface colors for light/dark)
    - Update `ui/theme/Type.kt` with Poppins font family (bundle font files in `res/font/`), weight mappings matching design system
    - _Requirements: 11.1–11.9, 12.1–12.7_

  - [x] 7.3 Implement PlanixorTheme with three-state theme support
    - Update `ui/theme/Theme.kt` with `PlanixorTheme` composable accepting `ThemeMode` (Light, Dark, System)
    - Create `LightColorScheme` and `DarkColorScheme` with exact hex values from design
    - Use `isSystemInDarkTheme()` for System mode
    - Create `model/ThemeMode.kt` enum (Light, Dark, System)
    - _Requirements: 8.1–8.10, 9.1–9.5_

  - [x] 7.4 Create ThemeViewModel and PreferencesRepository
    - Create `data/local/PreferencesRepository.kt` — reads/writes `planixor_theme`, `planixor_active_view`, `planixor_locale` from DataStore
    - Create `ui/theme/ThemeViewModel.kt` (`@HiltViewModel`) — exposes `themeMode: StateFlow<ThemeMode>`, `setTheme()` function
    - Read persisted theme on init; fall back to System if missing/invalid
    - Persist within 100ms of change
    - Create Hilt module (`di/DataStoreModule.kt`) providing DataStore instance
    - _Requirements: 8.1–8.8, 9.1–9.5, 10.3_

  - [x] 7.5 Set up Room database and CalendarEvent entity
    - Create `data/local/CalendarEventEntity.kt` with Room annotations (id UUID PK, title, description, startAt, endAt, isAllDay, eventType, color, modifiedAt, syncedAt, isDeleted)
    - Create `data/local/CalendarEventDao.kt` with basic queries (getByDateRange, getAll)
    - Create `data/local/PlanixorDatabase.kt` — Room database class
    - Create `model/CalendarView.kt` enum (Day, Week, Month, Year)
    - Create `model/EventType.kt` enum (ShiftMorning, ShiftAfternoon, ShiftNight, Personal, Meeting, Reminder)
    - Register database in Hilt module
    - _Requirements: 15.1–15.5_

- [x] 8. Android — Navigation and calendar screen
  - [x] 8.1 Implement Bottom Navigation Bar
    - Create `ui/navigation/BottomNavBar.kt` composable
    - 5 items in order: Calendar, Shifts, Reminders, Reports, Settings (icon + text label)
    - Active: `primary-blue` (#2563EB); inactive: `text-secondary` (#6B7280)
    - Minimum touch target: 48dp height
    - No "Home" item
    - Use Material 3 `NavigationBar` component
    - _Requirements: 1.3, 1.5, 3.1–3.4_

  - [x] 8.2 Update NavGraph with all screens and bottom navigation
    - Update `ui/navigation/AppNavigation.kt` — integrate `BottomNavBar` with `NavHost`
    - Create `ui/navigation/Screen.kt` sealed class with routes: Calendar, Shifts, Reminders, Reports, Settings
    - Calendar as start destination
    - Stub screens for Shifts, Reminders (placeholder composables)
    - Wire bottom nav selection to navigation
    - _Requirements: 1.1, 3.3_

  - [x] 8.3 Implement CalendarViewModel
    - Create `ui/calendar/CalendarViewModel.kt` (`@HiltViewModel`)
    - Expose `activeView: StateFlow<CalendarView>` (default Week, persisted to DataStore)
    - Expose `currentDate: StateFlow<LocalDate>` (always today on launch, not persisted)
    - Functions: `navigateForward()`, `navigateBackward()`, `switchView()`, `goToToday()`
    - Navigation logic: ±1 day/week/month/year based on activeView
    - Read last saved view from DataStore on init
    - _Requirements: 4.1–4.5, 5.1–5.8_

  - [x] 8.4 Implement CalendarScreen with TopAppBar and ViewSelector
    - Create `ui/calendar/CalendarScreen.kt` composable
    - TopAppBar: Planixor logo + ViewSelector (segmented tabs or dropdown) + DateNavigator (< label > + Today)
    - Create `ui/calendar/ViewSelector.kt` — compact segmented control with Day/Week/Month/Year
    - Create `ui/calendar/DateNavigator.kt` — prev/next arrows + date label (formatted per view and locale) + Today button
    - Today button: no-op if already on today's period
    - Date formatting uses `java.time.format.DateTimeFormatter` with locale
    - _Requirements: 4.6, 4.7, 5.5–5.8_

  - [x] 8.5 Implement calendar view composables (empty shells)
    - Create `ui/calendar/DayView.kt` — vertical 24h timeline with hour labels, empty state
    - Create `ui/calendar/WeekView.kt` — 7-column grid with day headers and hourly rows, empty state
    - Create `ui/calendar/MonthView.kt` — day grid (7 cols × 5-6 rows), current day highlighted, locale-dependent first day of week
    - Create `ui/calendar/YearView.kt` — 12 mini-month grid (3 cols × 4 rows), current day highlighted
    - First day of week: `WeekFields.of(locale).firstDayOfWeek`
    - All views display empty state message when no events
    - _Requirements: 17.3, 17.7_

  - [x] 8.6 Implement FAB on CalendarScreen
    - Create `ui/components/FAB.kt` composable
    - Circular, bottom-right, "+" icon (white), gradient background (blue → purple)
    - Minimum touch target: 48×48dp
    - OnClick: stub/placeholder
    - Accessible content description via `stringResource`
    - _Requirements: 13.1, 13.4–13.6_

- [x] 9. Android — Reports and Settings screens
  - [x] 9.1 Implement ReportsScreen with empty-state charts
    - Create `ui/reports/ReportsScreen.kt` composable
    - Create `ui/reports/ReportsViewModel.kt` — manages selected time range, exposes empty data
    - Single-column layout: TimeRangeSelector (Day/Week/Month/Year tabs, default Week) + BarChart + DonutChart + UpcomingList
    - Create `ui/reports/BarChart.kt` — Vico bar chart in empty state with brand colors
    - Create `ui/reports/DonutChart.kt` — Vico donut chart in empty state, "0h" center label
    - Display empty state message when no data
    - If Local_Store read fails: show error indication
    - _Requirements: 7.1–7.9_

  - [x] 9.2 Implement SettingsScreen with theme and language switchers
    - Create `ui/settings/SettingsScreen.kt` composable
    - Theme switcher: 3 radio options (Light, Dark, System) — calls ThemeViewModel.setTheme()
    - Language switcher: 2 options (Español, English) — updates locale in DataStore and applies
    - _Requirements: 8.1–8.8, 14.3, 14.5_

- [x] 10. Android — Internationalization
  - [x] 10.1 Create string resources for all UI text
    - Populate `res/values/strings.xml` (Spanish default) with all navigation labels, view names, date-related text, empty states, settings labels, accessibility descriptions
    - Create `res/values-en/strings.xml` with English translations
    - Ensure no hardcoded strings in any Kotlin composable (use `stringResource()` everywhere)
    - _Requirements: 14.1–14.4, 14.6_

- [x] 11. Checkpoint — Android feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Testing
  - [x] 12.1 Write unit tests for Zustand calendar store (React Web)
    - Test `setView` changes activeView
    - Test `navigateForward`/`navigateBackward` for each view (day±1, week±7, month±1, year±1)
    - Test `goToToday` resets to current date
    - Test persistence: activeView saved/restored from LocalStorage
    - Test default: `'week'` when no persisted value
    - _Requirements: 4.1–4.5, 5.1–5.4_

  - [x] 12.2 Write unit tests for ThemeProvider (React Web)
    - Test initial load with no stored preference → defaults to system
    - Test persisting theme selection to LocalStorage
    - Test applying correct class (`theme-light`/`theme-dark`) to `<html>`
    - Test fallback to `system` when invalid value stored
    - Test `matchMedia` listener registered in system mode
    - _Requirements: 8.1–8.10, 9.1–9.5_

  - [x] 12.3 Write unit tests for CalendarViewModel (Android)
    - Test default view is Week when no persisted value
    - Test `switchView` updates activeView StateFlow and persists
    - Test `navigateForward`/`navigateBackward` for each view
    - Test `goToToday` resets currentDate to today
    - Test persisted view restored on init
    - _Requirements: 4.1–4.5, 5.1–5.4_

  - [x] 12.4 Write unit tests for ThemeViewModel (Android)
    - Test initial theme is System when no persisted value
    - Test `setTheme()` persists and updates StateFlow
    - Test fallback to System when DataStore value is invalid
    - _Requirements: 8.1–8.8, 9.1–9.5_

  - [x] 12.5 Write component tests for Sidebar and BottomNav (React Web)
    - Test Sidebar renders 5 nav items in correct order
    - Test active item highlighted with correct color
    - Test keyboard navigation (Tab, Enter, Space)
    - Test BottomNav renders 5 items with icons and labels
    - Test no "Home" item in either component
    - _Requirements: 2.1–2.7, 3.1–3.4_

  - [x] 12.6 Write component tests for ViewSelector and DateNavigator (React Web)
    - Test ViewSelector renders 4 options, active highlighted
    - Test DateNavigator shows correct label format per view
    - Test Today button calls goToToday
    - Test prev/next buttons navigate correctly
    - _Requirements: 4.1–4.6, 5.5–5.8_

- [x] 13. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Unit tests validate store logic and ViewModel state transitions
- Component tests validate UI rendering and interactions
- This issue is **UI shell only** — all charts and lists render empty states
- The React Web project already has i18n (`react-i18next`) and Tailwind CSS configured, but the design specifies **CSS Modules + CSS Custom Properties** for this feature — follow the design
- The Android project already has Hilt, Navigation Compose, and theme files scaffolded — extend them
- First day of week is locale-dependent: Monday for `es`, Sunday for `en`
- The design specifies CSS Modules for scoped styling (not Tailwind) — each component gets a `.module.css` file

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4", "1.5", "7.1", "7.2"] },
    { "id": 1, "tasks": ["1.2", "2.1", "7.3", "7.4", "7.5"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "8.1", "8.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "8.3", "8.4", "8.6"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5", "3.6", "8.5"] },
    { "id": 5, "tasks": ["5.1", "5.2", "9.1", "9.2", "10.1"] },
    { "id": 6, "tasks": ["5.3", "5.4"] },
    { "id": 7, "tasks": ["12.1", "12.2", "12.3", "12.4"] },
    { "id": 8, "tasks": ["12.5", "12.6"] }
  ]
}
```
