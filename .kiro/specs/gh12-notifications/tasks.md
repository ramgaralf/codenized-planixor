# Implementation Plan: Notifications

## Overview

This plan implements the Notifications feature across all three platforms (Backend .NET 10, React Web PWA, Android Kotlin). The implementation follows the existing offline-first architecture with bidirectional sync. Tasks are organized in logical waves: data layer foundation → core logic → background infrastructure → UI → delivery channels → sync integration → property tests.

## Tasks

- [x] 1. Data layer foundation (entities, schemas, migrations, stores)
  - [x] 1.1 Create backend NotificationRecord entity and EF Core configuration
    - Create `Core/Entities/NotificationRecord.cs` with all fields (Id, UserId, CalendarEventId, AlertOffset, TriggerTime, IsDelivered, IsRead, ModifiedAt, SyncedAt, IsDeleted)
    - Implement `CreateFromSync`, `ApplySync`, and `MarkSynced` methods
    - Create `Persistence.MySql.Efc.DataContext/Entities/NotificationRecordConfiguration.cs` with table mapping, required properties, and indexes (UserId+ModifiedAt, UserId+IsDeleted, CalendarEventId+AlertOffset+IsDeleted)
    - Add `AlertOffsetsJson` property (VARCHAR(50), default "[]") to the CalendarEvent entity
    - Create EF Core migration for the NotificationRecords table and the CalendarEvent alertOffsets column
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 10.6_

  - [x] 1.2 Create backend NotificationRecord DTOs
    - Create `Dtos/NotificationRecord/Sync/NotificationRecordSyncRecord.cs` with Id, CalendarEventId, AlertOffset, TriggerTime, IsDelivered, IsRead, ModifiedAt, IsDeleted
    - Create push request/response DTOs following CalendarEvent sync pattern (batch of 100, acknowledged/rejected IDs)
    - Create pull request/response DTOs with cursor-based pagination (max 100 per page)
    - Update `CalendarEventSyncRecord` to include `AlertOffsets` (List<int>) field
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 1.3 Create React Web Dexie schema (version 7) and NotificationRecord interface
    - Update `src/data/db.ts` to version 7 adding `notifications` table with indexes: `id, calendarEventId, triggerTime, [isDelivered+isRead+isDeleted], isDeleted, modifiedAt`
    - Add `notificationSettings` table with `key` index
    - Create `NotificationRecord` TypeScript interface in `src/features/notifications/types.ts`
    - Add `alertOffsets` field (number[], default []) to existing CalendarEvent interface
    - _Requirements: 8.1, 8.6, 11.5_

  - [x] 1.4 Create Android Room entity and migration (version 6→7)
    - Create `NotificationRecordEntity.kt` data class with @Entity annotation, all fields, and indexes (calendarEventId+alertOffset+isDeleted, triggerTime+isDelivered+isDeleted, isDelivered+isRead+isDeleted, isDeleted, modifiedAt)
    - Create `MIGRATION_6_7`: CREATE TABLE notification_records + indexes, ALTER TABLE calendar_events ADD COLUMN alertOffsets
    - Add `alertOffsets: String = "[]"` to existing `CalendarEventEntity`
    - Register migration in the Room database builder
    - _Requirements: 8.1, 8.6, 11.5_

  - [x] 1.5 Create Android NotificationRecordDao
    - Create `data/local/NotificationRecordDao.kt` with Room @Dao annotation
    - Implement queries: getDueNotifications (triggerTime <= now, !isDelivered, !isDeleted), getUnreadDelivered (!isRead, isDelivered, !isDeleted, ORDER BY triggerTime DESC, LIMIT 100), getUnreadCount, getByCalendarEventId, getByCalendarEventIdAndOffset
    - Implement insert, update, and batch insert/update operations
    - _Requirements: 8.1, 2.1, 3.1, 3.6_

- [x] 2. Core notification logic (services and reconciliation)
  - [x] 2.1 Implement React Web notificationService
    - Create `src/features/notifications/services/notificationService.ts`
    - Implement `runCheckCycle()`: query Dexie for records where triggerTime <= now, isDelivered=false, isDeleted=false, ordered by triggerTime ASC; deliver via configured channel; set isDelivered=true, modifiedAt=now
    - Implement `reconcileNotifications(event)`: soft-delete existing non-delivered records for event; create new NotificationRecords for each alertOffset with future trigger time; enforce uniqueness on (calendarEventId, alertOffset)
    - Implement `deleteNotificationsForEvent(calendarEventId)`: soft-delete all records for the event
    - Implement `getUnreadCount()`: count where isRead=false, isDelivered=true, isDeleted=false
    - Use trigger time formula: eventStartDateTime(UTC) = startDay at 00:00 + startTime minutes; triggerTime = eventStartDateTime - alertOffset minutes
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 2.1, 2.2, 2.9, 8.3, 8.5, 8.7, 8.8, 9.1, 9.2_

  - [x] 2.2 Write property tests for notification record creation (React Web)
    - **Property 2: Notification record creation filters by future trigger time**
    - **Validates: Requirements 1.4**

  - [x] 2.3 Write property tests for alert config reconciliation (React Web)
    - **Property 3: Alert config reconciliation produces correct diff**
    - **Validates: Requirements 1.5, 1.6, 8.7**

  - [x] 2.4 Write property test for trigger time recomputation (React Web)
    - **Property 5: Trigger time recomputation on start time change**
    - **Validates: Requirements 1.8, 8.8, 9.1**

  - [x] 2.5 Write property test for due notification identification (React Web)
    - **Property 6: Due notification identification**
    - **Validates: Requirements 2.1, 2.2, 2.9, 6.6**

  - [x] 2.6 Implement Android NotificationService
    - Create `data/notification/NotificationService.kt` interface and implementation
    - Implement `runCheckCycle()`: query Room DAO for due records, deliver via configured channel, mark delivered
    - Implement `reconcileNotifications(event)`: soft-delete old records, create new records for future trigger times
    - Implement `deleteNotificationsForEvent(calendarEventId)`: cascade soft-delete
    - Implement `getUnreadCount()`: query count from DAO
    - Inject via Hilt as @Singleton
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 2.1, 2.2, 2.9, 8.3, 8.5, 8.7, 8.8, 9.1, 9.2_

  - [x] 2.7 Write property test for uniqueness constraint (React Web)
    - **Property 12: Uniqueness constraint on (calendarEventId, alertOffset)**
    - **Validates: Requirements 8.1**

  - [x] 2.8 Write property test for cascade soft-delete (React Web)
    - **Property 14: Cascade soft-delete on calendar event deletion**
    - **Validates: Requirements 8.5, 9.4**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Background process infrastructure
  - [x] 4.1 Implement React Web notification Web Worker
    - Create `src/workers/notification.worker.ts` as standalone Web Worker file
    - Implement `setInterval(checkCycle, 300000)` — 5-min timer that accesses IndexedDB directly via Dexie
    - Handle incoming messages: `{ type: 'CHECK_NOW' }` triggers immediate check cycle
    - Send `{ type: 'DELIVERED', count: number }` after delivering notifications for badge update
    - Export the notification service logic to be usable from within the Worker context
    - _Requirements: 6.2, 6.3, 6.6_

  - [x] 4.2 Implement React Web Worker registration and lifecycle management
    - Register Web Worker on app load via `new Worker()`
    - Listen for `visibilitychange` event → send `CHECK_NOW` to worker within 5s when document becomes visible
    - Listen for Worker `error` event → re-register and send immediate `CHECK_NOW`
    - Handle Worker `message` events to update badge count reactively
    - _Requirements: 6.4, 6.5, 2.7_

  - [x] 4.3 Implement Android NotificationCheckWorker (WorkManager)
    - Create `data/notification/NotificationCheckWorker.kt` extending `CoroutineWorker`
    - Call `NotificationService.runCheckCycle()` in `doWork()`
    - Register as `PeriodicWorkRequest` with 15-minute repeat interval in `PlanixorApplication.onCreate()`
    - Use `ExistingPeriodicWorkPolicy.KEEP` to prevent duplicate registrations
    - _Requirements: 7.1, 7.3_

  - [x] 4.4 Implement Android NotificationTimerService (foreground lifecycle-aware timer)
    - Create `data/notification/NotificationTimerService.kt` implementing `DefaultLifecycleObserver`
    - Annotate as `@Singleton` with Hilt injection
    - Register as observer of `ProcessLifecycleOwner` in `PlanixorApplication.onCreate()`
    - `onStart()`: start coroutine with `delay(300_000)` loop (5 min) calling `runCheckCycle()`
    - `onStop()`: cancel the timer coroutine
    - Use own `CoroutineScope(SupervisorJob() + Dispatchers.Default)`
    - Execute immediate check within 5s on qualifying bg→fg transition (onStart after onStop, excluding config changes)
    - _Requirements: 7.2, 7.6, 2.7_

- [x] 5. Notification delivery channels
  - [x] 5.1 Implement React Web notification settings service
    - Create `src/features/notifications/services/notificationSettings.ts`
    - Store channel preference in Dexie `notificationSettings` table (accessible from Web Worker)
    - Implement `getChannel(): NotificationChannel` and `setChannel(channel): void`
    - Default to "both" when no persisted value
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 5.2 Implement React Web System notification delivery
    - Integrate Web Notifications API in the check cycle
    - Display: Planixor app icon (192×192), event name truncated to 65 chars as title, localized alert label as body
    - Check `Notification.permission === "granted"` before each System delivery attempt
    - If permission not granted: retain `isDelivered=false`, reattempt next cycle
    - _Requirements: 2.3, 2.4, 2.5, 2.8, 5.4, 5.5_

  - [x] 5.3 Implement React Web permission handling
    - On channel selection to "System" or "Both": check `Notification.permission`
    - If "default": call `Notification.requestPermission()`
    - On denial or dismiss: show localized guidance, revert channel to "App" (atomic operation)
    - On revocation detection (during check cycle): skip System delivery, show inline warning in settings
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [x] 5.4 Implement Android notification channel and system delivery
    - Create notification channel "planixor_alerts" with `IMPORTANCE_HIGH` in `PlanixorApplication.onCreate()`
    - Implement System_Notification via `NotificationManagerCompat`: Planixor icon, event name (65 chars), localized alert label
    - Check `areNotificationsEnabled()` before delivery; skip System if disabled
    - _Requirements: 7.4, 7.5, 5.4, 5.5_

  - [x] 5.5 Implement Android notification preferences and permission handling
    - Create `NotificationPreferences` interface with `channelFlow: Flow<NotificationChannel>` and `setChannel()`
    - Store in DataStore preferences (device-local, not synced)
    - Default to "Both"
    - On "System"/"Both" selection: check `POST_NOTIFICATIONS` permission (API 33+), request if needed
    - On denial: show guidance, revert to "App"
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 5.1, 5.2_

  - [x] 5.6 Implement delivery channel routing logic (both platforms)
    - In both notificationService implementations: read channel setting, route delivery accordingly
    - "App": deliver as App_Notification only (mark isDelivered=true)
    - "System": deliver via native OS only (mark isDelivered=true on success)
    - "Both": deliver App first; if System fails, keep isDelivered=false, reattempt System next cycle
    - _Requirements: 2.3, 2.4, 2.5, 2.8, 2.10_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. UI components
  - [x] 7.1 Implement React Web AlertConfigField component
    - Create `src/features/notifications/components/AlertConfigField.tsx`
    - Multi-select chip/checkbox group with 4 options: "At start time" (0), "10 minutes before" (10), "1 hour before" (60), "1 day before" (1440)
    - Only render when event start is strictly in the future (start > now)
    - Persist selection to `alertOffsets` array on the calendar event record
    - Integrate into existing EventForm (create and edit flows)
    - Localize labels (Spanish + English)
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 11.1_

  - [x] 7.2 Implement React Web NotificationView and NotificationBadge
    - Create `src/features/notifications/components/NotificationView.tsx` as dropdown panel anchored to bell icon
    - Query: isRead=false, isDelivered=true, isDeleted=false, ORDER BY triggerTime DESC, LIMIT 100
    - Display: event icon + event name (truncated 60 chars with ellipsis) + alert label + time (relative <24h, absolute otherwise)
    - Derive display fields via join with CalendarEvent (no cache needed, soft-delete ensures join works)
    - Click item → mark isRead=true, update modifiedAt, remove from list
    - "Mark all as read" action in header
    - Empty state: localized "No pending notifications" message
    - If referenced event isDeleted=true: show name/icon but disable navigation
    - Create `src/features/notifications/components/NotificationBadge.tsx`: exact count 1-99, "99+" for >99, hidden at 0
    - Bell icon visibility: visible when channel is "App" or "Both", hidden when "System"
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.4, 4.5, 8.4_

  - [x] 7.3 Implement React Web notification settings section
    - Add "Notifications" section to the Settings page
    - Single-select control with 3 options: App, System, Both (default: "Both")
    - Persist immediately on selection (within 500ms, no confirmation needed)
    - Update bell icon visibility immediately on selection
    - Show inline warning when "System" selected but permission denied/revoked
    - Trigger permission request flow when "System" or "Both" selected
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9_

  - [x] 7.4 Implement Android AlertConfigSelector composable
    - Create `ui/components/AlertConfigSelector.kt` as multi-select chip group
    - Same 4 options with identical offsets as React Web
    - Only visible when event start is strictly in the future
    - Persist to `alertOffsets` field on CalendarEventEntity
    - Integrate into existing event form (create and edit)
    - Localize labels (Spanish + English)
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 11.1_

  - [x] 7.5 Implement Android NotificationsScreen and ViewModel
    - Create `ui/notifications/NotificationsScreen.kt` with Scaffold + TopAppBar + LazyColumn
    - Create `ui/notifications/NotificationsViewModel.kt` with unread notifications Flow
    - Query: isRead=false, isDelivered=true, isDeleted=false, ORDER BY triggerTime DESC, LIMIT 100
    - Display: event icon + name (60 chars) + alert label + relative/absolute time
    - Derive display fields via Room join with CalendarEvent
    - Tap item → mark isRead=true, update modifiedAt
    - "Mark all as read" in top bar action
    - Empty state message
    - Deleted event: show name/icon, no navigation
    - Badge in top bar: same rules as web (0=hidden, 1-99=exact, >99="99+")
    - Bell icon visibility logic tied to channel setting
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.4, 4.5, 8.4_

  - [x] 7.6 Implement Android notification settings section
    - Add "Notifications" heading/section to the existing Settings screen
    - Single-select radio/segmented control: App, System, Both (default: "Both")
    - Persist immediately via DataStore
    - Update bell icon visibility immediately
    - Inline warning when System selected but permission denied
    - Trigger POST_NOTIFICATIONS permission request when needed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9_

  - [x] 7.7 Write property tests for UI display logic (React Web)
    - **Property 1: Alert field visibility is determined by event start time**
    - **Property 7: Notification view query correctness**
    - **Property 8: Time display formatting**
    - **Property 9: Badge count display**
    - **Property 10: Bell icon visibility based on channel**
    - **Validates: Requirements 1.1, 1.3, 3.1, 3.2, 3.6, 4.4, 4.5**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. PWA manifest and icons
  - [x] 9.1 Create PWA web app manifest and icon assets
    - Create `public/manifest.json` with: name "Planixor", icons (192×192, 512×512 PNG), start_url, display "standalone", theme_color, background_color
    - Create/place icon PNG files in `public/icons/` (192×192 and 512×512)
    - Link manifest in `index.html` with `<link rel="manifest">`
    - Ensure manifest validates for PWA installability
    - _Requirements: 6.1_

- [x] 10. Sync integration
  - [x] 10.1 Create backend NotificationRecord repository
    - Create `Persistence.MySql.Efc.Repositories/NotificationRecord/` repository class
    - Implement `GetModifiedAfter(userId, lastSyncedAt, cursor, pageSize=100)` for pull
    - Implement `UpsertBatch(userId, records)` for push — insert new, apply LWW for conflicts (remote wins on tie)
    - Implement `GetByIds(userId, ids)` for conflict detection
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 10.2 Create backend sync push endpoint
    - Create `Api/Endpoints/NotificationRecord/NotificationRecordSyncPushEndpoints.cs`
    - POST `/api/v1/notification-records/sync/push` accepting batch of NotificationRecordSyncRecord (max 100)
    - Validate user ownership (UserId from JWT)
    - Return acknowledged/rejected IDs
    - Register endpoint in endpoint configuration
    - _Requirements: 10.1, 10.7_

  - [x] 10.3 Create backend sync pull endpoint
    - Create `Api/Endpoints/NotificationRecord/NotificationRecordSyncPullEndpoints.cs`
    - GET `/api/v1/notification-records/sync/pull?lastSyncedAt={ts}&cursor={cursor}`
    - Return max 100 records per page with cursor for pagination
    - Filter by UserId from JWT and modifiedAt > lastSyncedAt
    - _Requirements: 10.2, 10.5_

  - [x] 10.4 Update backend CalendarEvent sync endpoints for alertOffsets
    - Update CalendarEvent sync push handling to accept and persist `AlertOffsets` (parse JSON array, validate values ∈ {0,10,60,1440}, max 4 elements)
    - Update CalendarEvent sync pull response to include `AlertOffsets` field
    - Map between `AlertOffsetsJson` (DB column) and `List<int>` (DTO) in repository/mapping layer
    - _Requirements: 10.6_

  - [x] 10.5 Implement React Web notification sync service
    - Create `src/features/notifications/services/notificationSync.ts`
    - Push: query records where syncedAt is null OR modifiedAt > syncedAt, batch 100, POST to API
    - Pull: GET from API with lastSyncedAt + cursor pagination, merge with LWW (remote wins on tie)
    - Insert new pulled records, propagate deletions
    - Update syncedAt on successful push
    - Integrate into existing sync cycle (order: Push CalendarEvents → Push NotificationRecords → Pull CalendarEvents → Pull NotificationRecords)
    - Handle network failures gracefully (leave syncedAt unchanged)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8_

  - [x] 10.6 Implement Android NotificationRecordSyncAdapter
    - Create `data/sync/NotificationRecordSyncAdapter.kt` following CalendarEvent sync pattern
    - Push: query records needing sync, batch 100, POST to API
    - Pull: GET with cursor pagination, merge with LWW
    - Integrate into existing sync cycle with correct order
    - Handle network failures (leave syncedAt unchanged)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8_

  - [x] 10.7 Update React Web CalendarEvent sync for alertOffsets
    - Update CalendarEvent sync push to include `alertOffsets` array in payload
    - Update CalendarEvent sync pull to deserialize `alertOffsets` from response
    - Treat undefined/null alertOffsets as empty array on pull
    - _Requirements: 10.6_

  - [x] 10.8 Update Android CalendarEvent sync for alertOffsets
    - Update CalendarEvent sync push to include `alertOffsets` JSON string in payload
    - Update CalendarEvent sync pull to deserialize `alertOffsets` from response
    - Default to "[]" when field absent in response
    - _Requirements: 10.6_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integration wiring and event form integration
  - [x] 12.1 Wire React Web notification reconciliation into CalendarEvent save/edit
    - On event create with alertOffsets: call `notificationService.reconcileNotifications(event)`
    - On event edit (alertOffsets changed OR start time changed): call `reconcileNotifications(event)`
    - On event soft-delete: call `notificationService.deleteNotificationsForEvent(eventId)`
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 12.2 Wire Android notification reconciliation into CalendarEvent save/edit
    - On event create with alertOffsets: call `NotificationService.reconcileNotifications(event)`
    - On event edit (alertOffsets or start time changed): call `reconcileNotifications(event)`
    - On event soft-delete: call `NotificationService.deleteNotificationsForEvent(eventId)`
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 12.3 Write property tests for alertOffsets persistence and sync round-trip (React Web)
    - **Property 4: alertOffsets persistence round-trip**
    - **Property 15: alertOffsets validation**
    - **Validates: Requirements 1.7, 8.6, 10.6**

  - [x] 12.4 Write property tests for past trigger time soft-deletion and future restoration (React Web)
    - **Property 16: Past trigger time soft-deletion after recomputation**
    - **Property 17: Future restoration creates notifications**
    - **Validates: Requirements 9.2, 9.3, 9.5**

  - [x] 12.5 Write property tests for sync logic (React Web)
    - **Property 18: Push candidate identification**
    - **Property 19: Sync merge with LWW conflict resolution**
    - **Validates: Requirements 10.1, 10.3, 10.4, 10.5**

  - [x] 12.6 Write property tests for notification content and modifiedAt (React Web)
    - **Property 11: System notification content formatting**
    - **Property 13: modifiedAt updated on every write**
    - **Validates: Requirements 5.5, 8.3**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (Properties 1–19 from the design)
- Unit tests validate specific examples and edge cases
- The design specifies that CalendarEvent pull does NOT trigger local notification reconciliation — records travel via their own sync channel
- Sync order within a cycle: Push CalendarEvents → Push NotificationRecords → Pull CalendarEvents → Pull NotificationRecords
- Web Worker owns the timer and accesses IndexedDB directly (no main thread dependency for check cycles)
- NotificationSettings stored in IndexedDB (Dexie) for Web Worker accessibility, not localStorage
- Android NotificationTimerService is a lifecycle-aware @Singleton with ProcessLifecycleOwner
- Display fields derived via join with CalendarEvent at read time (no cache, soft-delete ensures join works)
- React Web: no Dexie migration needed for alertOffsets (schema-less for non-indexed fields)
- Android: Room migration 6→7 adds notification_records table AND alertOffsets column to calendar_events

## Post-Implementation Notes

The following architectural deviations were made during implementation, diverging from the original plan. All changes are reflected in the updated `design.md` and `requirements.md`.

### 1. Timezone: Local not UTC
- **Original:** `triggerTime = startDay at 00:00 UTC + startTime minutes - alertOffset`
- **Actual:** `triggerTime = startDay at 00:00 LOCAL + startTime minutes - alertOffset`
- **Reason:** `startTime` represents minutes from local midnight (user enters local time in the time picker), not UTC midnight. Affects both React Web and Android.

### 2. Android: AlarmManager replaces WorkManager for notifications
- **Original:** WorkManager with 15-min periodic task
- **Actual:** AlarmManager with `setExactAndAllowWhileIdle()` per notification record
- **Reason:** Samsung/OneUI aggressively delays WorkManager tasks. AlarmManager provides exact timing.
- `NotificationCheckWorker` code exists but is NOT enqueued.
- Added: `NotificationAlarmScheduler`, `NotificationAlarmReceiver`, `BootReceiver`
- Added permissions: `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`
- Alarms scheduled on record create, cancelled on delete, rescheduled on boot.

### 3. Default notification channel: "App" (was "Both")
- **Original:** Default is "Both" (app + system)
- **Actual:** Default is "App" (in-app only)
- **Reason:** "Both" requires system permission that isn't automatically requested. Starting with "App" means users must explicitly opt-in to system notifications (which naturally triggers the permission dialog).

### 4. "Both" channel: best-effort system delivery
- **Original:** If system fails, keep `isDelivered=false` and retry next cycle (blocking app notification)
- **Actual:** Always mark `isDelivered=true` (app notification always visible). System notification is best-effort.
- **Reason:** On Samsung and some browsers, system notification delivery can fail silently. Blocking app notifications on system failure meant notifications never appeared anywhere.

### 5. Web Worker: Timer-only architecture
- **Original:** Web Worker runs `runCheckCycle()` directly (including notification delivery)
- **Actual:** Web Worker is a pure timer that sends `RUN_CYCLE` messages. Main thread receives messages and runs `runCheckCycle()` where the Notification API is available.
- **Reason:** `Notification` API is unavailable in Web Worker contexts. System notifications could never be delivered from the worker.

### 6. Check cycle interval: 1 minute (was 5 minutes)
- **Original:** 5-minute interval
- **Actual:** 1-minute interval (foreground only; AlarmManager handles background on Android)
- **Reason:** 1 minute matches the precision of the time picker (minimum event duration). More responsive for "10 minutes before" and "At start time" alerts.

### 7. Immediate check cycle after event save
- **Original:** Check cycle only runs on timer
- **Actual:** `triggerImmediateCheckCycle()` (web) and `runCheckCycle()` (Android) called after every event create/update/delete
- **Reason:** Without this, users had to wait up to 1 minute for notifications to appear after saving an event with "At start time" offset.

### 8. Immediate badge refresh on mark-as-read
- **Original:** Badge only updates on next check cycle
- **Actual:** `refreshBadgeCount()` called immediately after `markAsRead` / `markAllAsRead`
- **Reason:** UX — badge should update instantly when user interacts with notifications.

### 9. Richer notification content
- **Original:** Title = event name, Body = alert label ("10 minutes before")
- **Actual:** Title = emoji + event name, Body = date + time (line 1) + time remaining (line 2)
- **Example:** "☀️ Turno Mañana" / "20 jun 2025 · 10:00" / "En 10 minutos"
- Android uses `BigTextStyle` for multiline. Web uses `\n` in body.

### 10. Web: Limitation notice in settings
- Added informational note in the notification settings UI: "Notifications will only be sent while the application is open or minimized in the browser."

### 11. Worker registration on app load
- `registerNotificationWorker()` is called in `App.tsx` `useEffect` on mount.
- Original design mentioned this but it was not explicitly detailed in task descriptions.

### 12. Android: NotificationTimerService with try-catch
- Added try-catch around `runCheckCycle()` calls to prevent app crashes if DataStore or DB has issues during startup.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5", "9.1"] },
    { "id": 2, "tasks": ["2.1", "2.6", "5.1", "5.5"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.7", "2.8", "4.1", "4.3", "4.4", "5.4"] },
    { "id": 4, "tasks": ["4.2", "5.2", "5.3", "5.6"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 6, "tasks": ["7.7", "10.1", "10.4", "10.7", "10.8"] },
    { "id": 7, "tasks": ["10.2", "10.3", "10.5", "10.6"] },
    { "id": 8, "tasks": ["12.1", "12.2"] },
    { "id": 9, "tasks": ["12.3", "12.4", "12.5", "12.6"] }
  ]
}
```
