# Implementation Plan: Reports Feature (gh10-reports)

## Overview

This plan implements the Reports feature across three platforms: React Web PWA (TypeScript/Recharts), Android App (Kotlin/Jetpack Compose/Canvas), and Backend API (.NET 10/PostgreSQL). The implementation is organized into parallel tracks after shared foundations (data models, aggregation logic) are established. Each task builds incrementally, with property-based tests validating correctness properties from the design.

## Tasks

- [x] 1. Backend — Annual Hours Config entity and sync endpoints

  - [x] 1.1 Create AnnualHoursConfig EF Core entity, configuration, and migration
    - Create `AnnualHoursConfig` entity class with fields: `Id` (Guid), `Year` (int), `ConfiguredHours` (int), `ModifiedAt` (DateTime), `SyncedAt` (DateTime?), `IsDeleted` (bool)
    - Create EF Core entity configuration with filtered unique index on `Year` WHERE `IsDeleted = false`
    - Add `DbSet<AnnualHoursConfig>` to the DbContext
    - Create and apply EF Core migration for the `AnnualHoursConfigs` table
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 1.2 Implement AnnualHoursConfig sync push endpoint
    - Create `POST /api/v1/annual-hours-config/sync/push` endpoint following the CalendarEvent sync push pattern
    - Accept `AnnualHoursConfigSyncPushRequest` with a list of up to 100 `AnnualHoursConfigSyncRecord` items
    - Extract `userId` from JWT claims (not request body)
    - Validate active subscription (reject 403 if inactive)
    - Upsert each record by `Id` using `INSERT ON CONFLICT UPDATE`
    - Return `AnnualHoursConfigSyncPushResponse` with `ProcessedCount`
    - Register endpoint in `AnnualHoursConfigRegisterEndpoints.cs`
    - _Requirements: 10.1, 10.7, 10.8_

  - [x] 1.3 Implement AnnualHoursConfig sync pull endpoint
    - Create `GET /api/v1/annual-hours-config/sync/pull` endpoint following the CalendarEvent sync pull pattern
    - Accept query params: `lastSyncedAt` (DateTime), `cursor` (string, optional)
    - Filter by `userId` (from JWT) + `modifiedAt > lastSyncedAt`
    - Paginate with cursor, max 100 records per page
    - Return `AnnualHoursConfigSyncPullResponse` with records list and `NextCursor`
    - Register endpoint in `AnnualHoursConfigRegisterEndpoints.cs`
    - _Requirements: 10.6_

- [x] 2. React Web — Data layer and aggregation engine

  - [x] 2.1 Add AnnualHoursConfig model and IndexedDB schema
    - Define `AnnualHoursConfig` TypeScript interface in `src/features/reports/models.ts`
    - Define `ReportData`, `TypeAggregate` interfaces
    - Update Dexie database schema (version bump) to add `annualHoursConfig` table with indices: `id, year, isDeleted, modifiedAt`
    - _Requirements: 9.1, 9.3, 9.5_

  - [x] 2.2 Implement report aggregation service (pure functions)
    - Create `src/features/reports/services/reportAggregator.ts`
    - Implement `formatDuration(totalMinutes: number): string` — converts minutes to `"{X}h {Y}m"`
    - Implement `formatHoursComparison(actualMinutes: number, configuredHours: number): string` — produces `"{A}h / {C}h"`
    - Implement `normalizeTotalMinutes(value: number): number` — clamps negatives/zero to 0
    - Implement `filterEventsForPeriod(events, startDate, endDate): events[]` — filters by startDay in range, isDeleted=false
    - Implement `aggregateByType(events, period): Map<typeId, totalMinutes>` — groups by eventTypeId, sums totalHours
    - Implement `computePercentages(totalsMap, configuredHours?): Map<typeId, percentage>` — calculates donut %
    - Implement `computeDonutSegments(percentages): segments[]` — applies 1% minimum arc and 100% single-type rule
    - Implement `sortByTotalDescending(aggregates): aggregates[]` — sorts for bar chart
    - Implement `createSyncBatches(records, batchSize=100): batches[]` — splits records into batches
    - _Requirements: 2.9, 2.10, 2.11, 3.8, 3.9, 5.8, 5.9, 6.7, 6.8, 13.1, 13.2, 13.5_

  - [x] 2.3 Write property tests for aggregation engine (Properties 1–6)
    - **Property 1: Duration formatter decomposition is correct** — for any non-negative integer, `formatDuration` produces correct `"{X}h {Y}m"` where `X*60+Y == totalMinutes`
    - **Validates: Requirements 2.11, 3.11, 5.10, 6.9, 13.1**
    - **Property 2: Non-positive minutes normalize to "0h 0m"** — for any integer ≤ 0, normalized value is 0
    - **Validates: Requirements 13.2, 13.5**
    - **Property 3: Aggregation includes only non-deleted events of correct type within period** — correct filtering logic
    - **Validates: Requirements 2.9, 2.10, 3.8, 3.9, 5.8, 5.9, 6.7, 6.8**
    - **Property 4: Grand total equals sum of per-type totals** — sum invariant holds
    - **Validates: Requirements 2.5, 2.7, 3.5, 3.7, 5.4, 5.6, 6.4, 6.6**
    - **Property 5: Relative percentages sum to 100% when no annual config** — percentage invariant
    - **Validates: Requirements 2.5, 3.5, 5.4, 6.4**
    - **Property 6: Bar chart ordering is descending by total hours** — sort invariant
    - **Validates: Requirements 2.4, 3.4, 5.3, 6.3**
    - Use `fast-check` library with Vitest, minimum 100 iterations per property

  - [x] 2.4 Write property tests for donut and percentage logic (Properties 9–11)
    - **Property 9: Donut minimum arc for sub-1% segments** — segments > 0% but < 1% get minimum 1% arc
    - **Validates: Requirements 2.6, 3.6**
    - **Property 10: Single type yields exactly 100.0% in donut** — no rounding artifacts
    - **Validates: Requirements 6.5**
    - **Property 11: Annual percentages use configured hours as denominator** — percentage = typeMinutes / (configuredHours*60) * 100
    - **Validates: Requirements 5.5**
    - Use `fast-check` library with Vitest, minimum 100 iterations per property

  - [x] 2.5 Implement AnnualHoursConfig store (CRUD + validation)
    - Create `src/features/reports/hooks/useAnnualConfig.ts` hook
    - Implement `save(year, configuredHours)` — validates range (year 2000–2100, hours 1–8784), upserts record with modifiedAt=now, syncedAt=null
    - Implement `softDelete(year)` — sets isDeleted=true, modifiedAt=now, syncedAt=null
    - Implement `getByYear(year)` — returns non-deleted config for year or null
    - Implement `validateAnnualConfig(year, configuredHours)` — returns validation result
    - Enforce uniqueness: only one non-deleted record per year (check before insert, update if exists)
    - _Requirements: 8.7, 8.8, 8.11, 9.2, 9.4, 9.6_

  - [x] 2.6 Write property tests for AnnualHoursConfig store (Properties 7, 8, 13)
    - **Property 7: Annual config uniqueness — one non-deleted record per year** — at most one non-deleted per year
    - **Validates: Requirements 9.2**
    - **Property 8: Validation rejects out-of-range year or configuredHours** — rejects invalid ranges
    - **Validates: Requirements 8.11, 9.6**
    - **Property 13: Config save sets modifiedAt to current UTC and clears syncedAt** — write invariant
    - **Validates: Requirements 9.4**
    - Use `fast-check` library with Vitest, minimum 100 iterations per property

  - [x] 2.7 Implement AnnualHoursConfig sync service
    - Create `src/features/reports/services/annualHoursConfigSync.ts` following the calendarEventSync pattern
    - Implement push: send records where `syncedAt` is null or `modifiedAt > syncedAt` in batches of 100
    - Implement pull: request records from API after `lastSyncedAt`, paginate with cursor (max 100 per page)
    - Implement `resolveConflict(local, remote)` — LWW based on modifiedAt, prefer remote on tie
    - Handle 5xx errors (stop push cycle) vs 4xx errors (mark as synced, continue)
    - Register with existing sync service trigger mechanism
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 2.8 Write property tests for sync service (Properties 12, 14)
    - **Property 12: Sync conflict resolution — last writer wins, remote on tie** — LWW correctness
    - **Validates: Requirements 10.2**
    - **Property 14: Sync push respects batch size limit** — batches never exceed 100 records
    - **Validates: Requirements 10.1**
    - Use `fast-check` library with Vitest, minimum 100 iterations per property

- [x] 3. Checkpoint — Backend and Web data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. React Web — Reports page UI components

  - [x] 4.1 Implement TimeRangeSelector and DateNavigator components
    - Create `src/features/reports/components/TimeRangeSelector.tsx` — segmented control (Month | Year)
    - Create `src/features/reports/components/DateNavigator.tsx` — left/right arrows, month-year or year label, Today button (right-aligned)
    - Month mode: navigable range currentYear-10 to currentYear+10, default current month
    - Year mode: navigable range currentYear-10 to currentYear+10, default current year
    - Today button: resets to current month (Month mode) or current year (Year mode)
    - All text localized (Spanish/English)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 12.1, 12.5_

  - [x] 4.2 Implement reports container with state management
    - Create `src/features/reports/reports.tsx` — container component
    - Implement `useReportData` hook in `src/features/reports/hooks/useReportData.ts`
    - Manage state: mode (month/year), selectedMonth, selectedYear, previousMonth, previousYear
    - Mode switching: preserve year when going Month→Year; restore previous month when Year→Month
    - Reactive recalculation when date selection changes (within 200ms target)
    - Wire TimeRangeSelector and DateNavigator events to state
    - _Requirements: 1.6, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 4.3 Implement HorizontalBarChart component (Recharts)
    - Create `src/features/reports/components/HorizontalBarChart.tsx`
    - Horizontal bars with emoji icon on y-axis, hours formatted as `"{X}h {Y}m"` beside each bar
    - Each bar colored with `backgroundColor` from shift/reminder type
    - Bars ordered descending by total hours (top = most hours)
    - X-axis starts at 0 representing hours
    - Support both light and dark mode themes (axis labels, background)
    - _Requirements: 2.3, 2.4, 3.3, 3.4, 5.3, 6.3, 12.3, 12.4_

  - [x] 4.4 Implement DonutChart component (Recharts)
    - Create `src/features/reports/components/DonutChart.tsx`
    - Donut chart using Recharts `<Pie>` with `innerRadius`/`outerRadius`
    - Each segment colored with type's `backgroundColor`
    - Center text: total hours `"{X}h {Y}m"` or comparison `"{A}h / {C}h"` when annual config exists (shifts only, year mode)
    - `minAngle={3.6}` for 1% minimum arc on sub-1% segments
    - Single type renders exactly 100.0% (full donut, no artifacts)
    - Support light and dark mode themes
    - _Requirements: 2.5, 2.6, 3.5, 3.6, 5.4, 5.5, 6.4, 6.5, 12.3, 12.4_

  - [x] 4.5 Implement ReportTable component
    - Create `src/features/reports/components/ReportTable.tsx`
    - Display rows with: emoji icon, name, total hours `"{X}h {Y}m"`
    - Monthly mode: rows sorted alphabetically by name (shifts) or descending by hours (reminders)
    - Annual mode: rows sorted descending by hours
    - Final summary row: "Total" label + grand total hours
    - When annual config exists (year mode, shifts): additional rows for configured hours and difference
    - Difference row: green (#10B981) if surplus (>=), red if deficit (<)
    - Localized "Total" label
    - _Requirements: 2.7, 2.8, 3.7, 5.6, 5.7, 6.6, 12.5_

  - [x] 4.6 Implement ShiftsSection and RemindersSection components
    - Create `src/features/reports/components/ShiftsSection.tsx` — composes HorizontalBarChart + DonutChart + ReportTable for shifts
    - Create `src/features/reports/components/RemindersSection.tsx` — composes HorizontalBarChart + DonutChart + ReportTable for reminders
    - Layout order: BarChart first, DonutChart second, Table third
    - Conditionally render based on data availability (hide section entirely if no events)
    - Pass correct ordering modes: monthly shifts table = alphabetical, all bars = descending by hours
    - Handle soft-deleted definitions: use last known name/icon/backgroundColor from local store
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.10, 5.1, 5.2, 6.1, 6.2_

  - [x] 4.7 Implement EmptyState component
    - Create `src/features/reports/components/EmptyState.tsx`
    - Display localized message: "No data to display" / "Sin datos para mostrar"
    - Centered in the chart content area
    - Accessible `role="status"` region for screen reader announcement
    - Shown only when no shift AND no reminder events exist for the period
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3_

  - [x] 4.8 Implement AnnualConfigModal component
    - Create `src/features/reports/components/AnnualConfigModal.tsx`
    - Centered dialog with: numeric input, save button, cancel button
    - Input: digits only (0-9), no decimals/letters/special chars
    - Validation: range 1–8784, localized error message on invalid
    - Empty input with existing config → soft-delete on submit
    - Empty input with no existing config → no-op, dismiss
    - Pre-populate with existing value or show placeholder "1800"
    - Dismiss on cancel/click-outside/escape without saving
    - Submit + dismiss race: prioritize submit
    - On save success: dismiss modal, trigger chart refresh
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 12.6_

  - [x] 4.9 Wire ReportsPage route and top bar integration
    - Update `src/pages/ReportsPage.tsx` to render the reports container component
    - Integrate Annual_Config_Button in the global top bar (same position as "new event" on Calendar)
    - Show Annual_Config_Button only in Year mode, hide in Month mode
    - Page does NOT render its own title heading (handled by global top bar)
    - Add i18n keys for all report strings (English + Spanish)
    - _Requirements: 1.1, 1.7, 1.8, 1.9, 8.1_

  - [x] 4.10 Write unit tests for Reports page components
    - Test TimeRangeSelector mode switching and date state preservation
    - Test DateNavigator boundary navigation (10-year range)
    - Test EmptyState conditional rendering (no data, only shifts, only reminders)
    - Test AnnualConfigModal validation (range errors, empty submit no-op, soft-delete)
    - Test Shift_Table alphabetical ordering in monthly mode
    - Test annual surplus/deficit row color (green vs red)
    - Test soft-deleted reminder definition still renders with last known metadata
    - _Requirements: 1.6, 4.1, 4.2, 4.3, 8.11, 8.12, 3.10, 5.7_

- [x] 5. Checkpoint — React Web reports UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Android — Data layer and aggregation engine

  - [x] 6.1 Create AnnualHoursConfig Room entity, DAO, and database migration
    - Create `AnnualHoursConfigEntity.kt` in `data/local/` with fields: id (String PK), year (Int), configuredHours (Int), modifiedAt (Long), syncedAt (Long?), isDeleted (Boolean)
    - Add indices on `[year, isDeleted]` and `[modifiedAt]`
    - Create `AnnualHoursConfigDao.kt` with queries: getByYear, getAll (non-deleted), getPendingSync, upsert
    - Add migration to `PlanixorDatabase.kt` (version bump, create `annual_hours_config` table)
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 6.2 Implement AnnualHoursConfig repository
    - Create `AnnualHoursConfigRepository.kt` in `data/local/` following existing Shift/Reminder repository patterns
    - Implement `getByYear(year): Flow<AnnualHoursConfig?>` — non-deleted config for year
    - Implement `save(year, configuredHours): Result<Unit>` — validates range, upserts with modifiedAt=now, syncedAt=null
    - Implement `softDelete(year): Result<Unit>` — sets isDeleted=true, modifiedAt=now, syncedAt=null
    - Implement `getPendingSync(): List<AnnualHoursConfig>` — records needing sync
    - Implement `upsertFromSync(records)` — bulk upsert from sync pull
    - Enforce uniqueness: one non-deleted record per year
    - _Requirements: 8.7, 8.8, 9.2, 9.4, 9.6_

  - [x] 6.3 Implement report aggregation utilities (Kotlin)
    - Create utility functions in `domain/` or `ui/reports/` package (mirror web aggregation logic):
    - `formatDuration(totalMinutes: Int): String` — `"{X}h {Y}m"`
    - `formatHoursComparison(actualMinutes: Int, configuredHours: Int): String` — `"{A}h / {C}h"`
    - `normalizeTotalMinutes(value: Int): Int` — clamp to 0
    - `filterEventsForPeriod(events, startDate, endDate): List<CalendarEvent>`
    - `aggregateByType(events): Map<String, Int>` — group by eventTypeId, sum totalHours
    - `computePercentages(totalsMap, configuredHours?): Map<String, Double>`
    - `computeDonutSegments(percentages): List<DonutSegment>` — 1% min arc, single type = 100%
    - `sortByTotalDescending(aggregates): List<TypeAggregate>`
    - _Requirements: 2.9, 2.10, 2.11, 3.8, 3.9, 5.8, 5.9, 6.7, 6.8, 13.1, 13.2, 13.5_

  - [x] 6.4 Write property tests for Android aggregation engine (Properties 1–6)
    - **Property 1: Duration formatter decomposition is correct** — `formatDuration` correctness
    - **Validates: Requirements 2.11, 3.11, 5.10, 6.9, 13.1**
    - **Property 2: Non-positive minutes normalize to "0h 0m"** — normalization correctness
    - **Validates: Requirements 13.2, 13.5**
    - **Property 3: Aggregation includes only non-deleted events of correct type within period**
    - **Validates: Requirements 2.9, 2.10, 3.8, 3.9, 5.8, 5.9, 6.7, 6.8**
    - **Property 4: Grand total equals sum of per-type totals**
    - **Validates: Requirements 2.5, 2.7, 3.5, 3.7, 5.4, 5.6, 6.4, 6.6**
    - **Property 5: Relative percentages sum to 100% when no annual config**
    - **Validates: Requirements 2.5, 3.5, 5.4, 6.4**
    - **Property 6: Bar chart ordering is descending by total hours**
    - **Validates: Requirements 2.4, 3.4, 5.3, 6.3**
    - Use Kotest property testing with JUnit 4, minimum 100 iterations per property

  - [x] 6.5 Write property tests for Android donut, store, and sync (Properties 7–14)
    - **Property 7: Annual config uniqueness — one non-deleted record per year**
    - **Validates: Requirements 9.2**
    - **Property 8: Validation rejects out-of-range year or configuredHours**
    - **Validates: Requirements 8.11, 9.6**
    - **Property 9: Donut minimum arc for sub-1% segments**
    - **Validates: Requirements 2.6, 3.6**
    - **Property 10: Single type yields exactly 100.0% in donut**
    - **Validates: Requirements 6.5**
    - **Property 11: Annual percentages use configured hours as denominator**
    - **Validates: Requirements 5.5**
    - **Property 12: Sync conflict resolution — last writer wins, remote on tie**
    - **Validates: Requirements 10.2**
    - **Property 13: Config save sets modifiedAt to current UTC and clears syncedAt**
    - **Validates: Requirements 9.4**
    - **Property 14: Sync push respects batch size limit**
    - **Validates: Requirements 10.1**
    - Use Kotest property testing with JUnit 4, minimum 100 iterations per property

  - [x] 6.6 Implement AnnualHoursConfig sync service (Android)
    - Integrate Annual_Hours_Config into the existing Android sync service (`data/sync/`)
    - Implement push: send pending records (syncedAt null or modifiedAt > syncedAt) in batches of 100
    - Implement pull: paginated fetch from API after lastSyncedAt, merge with LWW conflict resolution
    - Handle 5xx (stop push) vs 4xx (mark synced, continue)
    - Register with existing sync triggers (WorkManager, app lifecycle)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 7. Checkpoint — Android data layer and backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Android — Reports screen UI

  - [x] 8.1 Implement ReportsViewModel state management
    - Update `ReportsViewModel.kt` to manage full report state
    - Define `ReportsUiState` data class: mode, selectedMonth, selectedYear, previousMonth, previousYear, isConfigDialogOpen, reportData, isLoading
    - Implement mode switching logic with date preservation (Month→Year preserves year, Year→Month restores previous month)
    - Query calendarEvents from local DB, filter by period, aggregate using utility functions
    - Reactive recalculation on date/mode change via StateFlow
    - Load AnnualHoursConfig for selected year (year mode only)
    - _Requirements: 1.2, 1.6, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 8.2 Implement TimeRangeSelector and DateNavigator composables
    - Create/update `ui/components/TimeRangeSelector.kt` — segmented control (Month | Year)
    - Create/update `ui/components/DateNavigator.kt` — arrows + label + Today button (right-aligned)
    - Month mode: display localized month-year, navigable ±10 years from current year
    - Year mode: display year label, navigable ±10 years from current year
    - Today button resets to current month/year
    - Localized strings (Spanish/English)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 12.1, 12.5_

  - [x] 8.3 Update BarChart and DonutChart canvas composables for reports
    - Update existing `BarChart.kt` to support horizontal bars with: emoji icon y-axis, hours label beside bar, per-bar backgroundColor, descending order
    - Update existing `DonutChart.kt` to support: per-segment backgroundColor, center text (total hours or comparison format), minAngle 3.6f degrees for 1% min arc, single-type = full donut
    - Support light/dark mode theming for axes, labels, borders
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.3, 3.4, 3.5, 3.6, 5.3, 5.4, 5.5, 6.3, 6.4, 6.5, 12.3, 12.4_

  - [x] 8.4 Implement ReportTable composable
    - Create `ui/reports/ReportTable.kt` or `ui/components/ReportTable.kt`
    - Display rows: emoji icon + name + hours "{X}h {Y}m"
    - Monthly shifts: alphabetical sort; monthly reminders + annual: descending by hours
    - Summary row: "Total" + grand total
    - Annual config shift table: extra rows (configured hours, difference with green/red color)
    - _Requirements: 2.7, 2.8, 3.7, 5.6, 5.7, 6.6, 12.5_

  - [x] 8.5 Compose full ReportsScreen with sections and empty state
    - Update `ReportsScreen.kt` to compose: TimeRangeSelector + DateNavigator + ShiftsSection + RemindersSection + EmptyState
    - Conditionally show/hide sections based on data availability
    - Empty state: centered localized message, accessible semantics
    - Handle soft-deleted definitions (use last known metadata from local store)
    - Wire everything to ReportsViewModel state observations
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.10, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x] 8.6 Implement AnnualConfigDialog composable
    - Create `ui/reports/AnnualConfigDialog.kt` — centered dialog (NOT bottom sheet)
    - Numeric input: digits only, range 1–8784 validation
    - Pre-populate existing value or show placeholder "1800"
    - Save/Cancel buttons, localized validation error message
    - Empty submit with existing config → soft-delete; empty with no config → dismiss (no-op)
    - Dismiss on cancel, outside tap, back button without saving
    - On save: dismiss, trigger chart refresh via ViewModel
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 12.6_

  - [x] 8.7 Wire Annual_Config_Button in Android top bar and navigation
    - Show Annual_Config_Button in the global top bar when ReportsScreen is active AND Year mode is selected
    - Hide when Month mode is selected or on other screens
    - Reports navigation item: positioned second after Calendar in bottom nav (icon only, no label)
    - Page title shown in top bar only (no page-level heading)
    - _Requirements: 1.1, 1.7, 1.8, 1.9, 8.1_

  - [x] 8.8 Write unit tests for Android reports UI state
    - Test ViewModel mode switching preserves/restores dates correctly
    - Test DateNavigator boundary navigation
    - Test empty state conditional rendering logic
    - Test AnnualConfigDialog validation (range, empty submit behaviors)
    - Test sort order: alphabetical (monthly shifts table) vs descending (bars, annual table)
    - _Requirements: 1.6, 4.1, 8.11, 8.12_

- [x] 9. Checkpoint — Android reports UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integration testing and final wiring

  - [x] 10.1 Write React Web integration tests (RTL)
    - Test: Reports page renders charts for month with shift and reminder data
    - Test: Reports page shows empty state for empty month
    - Test: Annual config modal save triggers chart refresh
    - Test: Mode switch preserves date state (Month→Year→Month roundtrip)
    - Test: Today button resets to current period
    - Test: Donut chart does NOT render when all types have 0 total minutes (avoids division by zero)
    - _Requirements: 4.1, 8.9, 1.6, 11.1_

  - [x] 10.2 Write Android Compose integration tests
    - Test: ReportsScreen state transitions (mode switch, date navigation)
    - Test: AnnualConfigDialog validation feedback
    - Test: Empty state shows/hides correctly based on event data
    - _Requirements: 11.1, 8.11, 4.1_

  - [x] 10.3 Add i18n strings for Reports feature (both platforms)
    - React Web: add report-related keys to English and Spanish translation files
    - Android: add report-related string resources to `strings.xml` (English) and `strings.xml` (Spanish)
    - Keys: reports page title, month/year labels, today button, annual config modal title/labels/validation errors, empty state message, "Total" label, surplus/deficit labels
    - _Requirements: 12.5_

- [x] 11. Final checkpoint — All platforms integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation across all three platforms
- Property tests validate universal correctness properties defined in the design (14 properties total)
- Unit tests validate specific examples and edge cases
- Backend (task 1), Web data layer (task 2), and Android data layer (task 6) can be developed in parallel
- Web UI (task 4) depends on Web data layer (task 2); Android UI (task 8) depends on Android data layer (task 6)
- The donut chart must NOT render when total minutes for all types equals 0 (avoids division by zero) — bar chart and table still render with "0h 0m"
- Soft-deleted shift/reminder definitions must still be queryable for display (lookups don't filter by isDeleted)
- Missing definitions use fallback: icon `❓`, name `"Unknown"`, color `#6B7280`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "6.2", "6.3"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "6.4", "6.5"] },
    { "id": 3, "tasks": ["2.6", "2.7", "6.6"] },
    { "id": 4, "tasks": ["2.8", "4.1", "8.1", "8.2"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "4.5", "8.3", "8.4"] },
    { "id": 6, "tasks": ["4.6", "4.7", "4.8", "8.5", "8.6"] },
    { "id": 7, "tasks": ["4.9", "4.10", "8.7", "8.8"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
