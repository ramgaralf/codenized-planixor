# Requirements Document

## Introduction

Calendar Event Management enables users to create, view, modify, and delete calendar events across all Planixor platforms (React Web PWA and Android App). Calendar events are used to organize work shifts and reminders on the calendar, displayed in four view modes: day, week, month, and year. Events reference previously created shifts or reminders as their type, and are subject to a constraint of one work shift per day. The feature follows the offline-first architecture — all CRUD operations happen locally first, with synchronization available for subscribed users.

## Glossary

- **Calendar_Event**: A scheduled occurrence spanning one or more days and a time range, linked to either a Shift or Reminder type. Contains event type, reference ID, start day, end day, start time, end time, total hours, and optional notes.
- **Event_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all calendar event records on the device.
- **Sync_Service**: The cross-cutting synchronization module responsible for pushing and pulling calendar event records to/from the backend API for subscribed users.
- **Calendar_Page**: The main calendar UI page accessible via the "Calendar" navigation item that displays events in the selected view mode.
- **Event_Form**: The UI component used for both creating and editing a calendar event, containing all configurable fields as defined in the Fields and Configuration section.
- **Event_Card**: The visual component that represents a calendar event within the calendar views.
- **Event_Detail_Page**: The UI page that displays full details of a calendar event and allows modification or deletion.
- **Confirmation_Modal**: A dialog that requires explicit user confirmation before executing destructive operations such as event deletion.
- **View_Mode**: The calendar display mode, one of: Day, Week, Month, or Year.
- **Day_Navigator**: A navigation control that allows browsing to the next or previous day within the Day view.
- **Month_Navigator**: A navigation control that allows browsing to the same day in the next or previous month within the Day view.
- **Year_Navigator**: A navigation control that allows browsing to the same day and month in the next or previous year within the Day view.
- **Week_Navigator**: A navigation control that allows browsing to the next or previous week within the Week view.
- **Event_Type_Selector**: A dropdown component displaying available shifts and reminders in `{type}: {name}` format, ordered alphabetically by display name, filtered to active and non-deleted items only.
- **Shift**: A previously created work shift definition (from Shift Management) that is active and not deleted.
- **Reminder**: A previously created reminder definition (from Reminder Management) that is active and not deleted.
- **Backend_API**: The .NET 10 REST API that serves as the synchronization hub for subscribed users, enforcing authorization and data ownership.
- **Crossing_Midnight_Shift**: A shift definition where `endTime` is less than `startTime`, indicating the shift ends on the following day. When assigned to a calendar event, `endDay` is automatically set to `startDay + 1`.
- **Total_Hours**: A read-only computed field representing the total duration of an event in minutes. For shifts, derived from the shift's `hoursWorked` field. For reminders, calculated from the time and day difference between start and end.

## Requirements

### Requirement 1: Create a Calendar Event

**User Story:** As a user, I want to create a calendar event by selecting a shift or reminder type, choosing a start day, end day, and setting a time range, so that I can schedule work shifts and reminders on my calendar.

#### Acceptance Criteria

1. WHEN the user submits the Event_Form with all required fields populated, THE Event_Store SHALL persist a new calendar event record with a client-generated UUID, the provided field values, `totalHours` computed according to the event type rules, `modifiedAt` set to the current UTC timestamp, `syncedAt` set to null, and `isDeleted` set to false.
2. THE Event_Form SHALL require all of the following fields before allowing submission: event type selection from the Event_Type_Selector (which stores both `eventType` as "shift" or "reminder" and `eventTypeId` as the UUID of the selected item), start day (date in YYYY-MM-DD format), end day (date in YYYY-MM-DD format), start time (minutes from midnight, 0-1439), and end time (minutes from midnight, 0-1439).
3. THE Event_Form SHALL include an optional notes field with a maximum of 250 characters.
4. WHEN the user selects a value from the Event_Type_Selector, THE Event_Form SHALL automatically populate the name, icon, and background color fields as read-only values derived from the selected shift or reminder definition.
5. WHEN the user selects a shift from the Event_Type_Selector, THE Event_Form SHALL auto-populate `startTime` and `endTime` from the shift definition as read-only fields (not editable by the user), and SHALL auto-populate `totalHours` from the shift's `hoursWorked` field as a read-only value; WHEN the user selects a reminder, THE Event_Form SHALL allow the user to edit `startTime` and `endTime` via timepickers, and SHALL auto-calculate `totalHours` based on the time and day difference as a read-only value.
6. WHEN the user selects a shift from the Event_Type_Selector where `endTime` is less than `startTime` (Crossing_Midnight_Shift), THE Event_Form SHALL automatically set `endDay` to `startDay + 1` day.
7. WHEN the user selects a value from the Event_Type_Selector, THE Event_Form SHALL display only shifts and reminders that have `isActive` set to true and `isDeleted` set to false, formatted as `{type}: {name}` and ordered alphabetically by display name; inactive event types SHALL be completely hidden from the selector interface and not displayed in any disabled or dimmed state.
8. WHEN the user cancels event creation, THE Event_Form SHALL discard all entered data and navigate back to the Calendar_Page without persisting any record, preserving the previous calendar view state.
9. WHEN a new event is successfully created, THE Event_Form SHALL clear all form fields, then navigate back to the Calendar_Page which SHALL display the newly created event in the current view.
10. THE Event_Form SHALL enforce the following time validation: for reminder events where `endDay` equals `startDay`, `endTime` MUST be strictly greater than `startTime`; for reminder events where `endDay` is greater than `startDay`, any combination of `startTime` and `endTime` is valid; for shift events, no time validation is applied (times are read-only from the shift definition). IF the validation fails, THEN THE Event_Form SHALL prevent submission and display an error message; WHEN the user corrects the values, THE Event_Form SHALL immediately clear the validation error.
11. THE Event_Form SHALL enforce that `endDay` is greater than or equal to `startDay`; IF the user sets `endDay` earlier than `startDay`, THEN THE Event_Form SHALL prevent submission and display a validation error.
12. IF the user attempts to submit the Event_Form with one or more required fields empty, THEN THE Event_Form SHALL prevent submission and visually indicate each field that requires input; additionally, THE Backend_API SHALL reject any sync push containing an incomplete calendar event record (missing required fields) and return a validation error response.
13. WHEN the user corrects a previously indicated required field, THE Event_Form SHALL immediately remove the visual error indicator for that field.

### Requirement 2: One Shift Per Day Constraint

**User Story:** As a user, I want the system to prevent me from scheduling more than one work shift per day, so that my calendar remains consistent and avoids scheduling conflicts.

#### Acceptance Criteria

1. WHEN the user attempts to create a calendar event with `eventType` set to "shift" for a specific `startDay`, THE Event_Store SHALL verify that no other non-deleted calendar event with `eventType` "shift" exists with the same `startDay`.
2. IF a non-deleted calendar event with `eventType` "shift" already exists for the selected `startDay`, or IF any other field validation error exists (including time validation or missing required fields), THEN THE Event_Form SHALL prevent submission and display the applicable localized validation messages, blocking the entire save operation until all errors are resolved.
3. WHEN the user attempts to modify a calendar event by changing its `startDay` and the `eventType` is "shift", THE Event_Store SHALL verify that no other non-deleted calendar event with `eventType` "shift" exists for the target `startDay`, excluding the event being modified; IF a conflict exists on the target date, THEN THE Event_Form SHALL block the entire save operation (including any other modified fields) and display a validation message; IF no conflict exists on the target date, THEN THE Event_Store SHALL allow the `startDay` change.
4. THE Event_Form SHALL allow multiple calendar events with `eventType` set to "reminder" on the same `startDay` without restriction.
5. WHEN the user changes the event type from "reminder" to "shift" in the Event_Form, THE Event_Store SHALL validate the one-shift-per-day constraint against the selected `startDay` before allowing submission.

### Requirement 3: View Calendar Events in Day Mode

**User Story:** As a user, I want to view my calendar events on a timeline in Day mode, so that I can see my schedule for a specific day with events displayed chronologically.

#### Acceptance Criteria

1. THE Calendar_Page in Day View_Mode SHALL display calendar events on a vertical timeline spanning from 00:00 to 23:59, divided into 1-hour slots, where events that start earlier appear higher on the timeline, and overlapping events are displayed side by side within the same time slot.
2. THE Calendar_Page in Day View_Mode SHALL render each Event_Card with: the background color of the calendar event; the icon and name on the first line (name truncated with ellipsis if it exceeds the available card width); start time and end time in HH:mm format and total duration in "Xh Ym" format on the second line; and notes on the third line (truncated with ellipsis to a single line if content exceeds the available card width).
3. THE Calendar_Page in Day View_Mode SHALL provide three independent navigation controls: a Day_Navigator to browse to the next or previous day, a Month_Navigator to browse to the same day in the next or previous month, and a Year_Navigator to browse to the same day and month in the next or previous year.
4. THE Calendar_Page SHALL display only calendar events where `isDeleted` is false and the event day matches the currently displayed date range, applying this filtering rule universally across all View_Modes (Day, Week, Month, and Year).
5. WHEN the user taps or clicks an Event_Card in Day View_Mode, THE Calendar_Page SHALL navigate to the Event_Detail_Page for that event.
6. WHEN the Calendar_Page opens in Day View_Mode for the current date, THE Calendar_Page SHALL display a horizontal blue line with a circle marker at the position corresponding to the current time, and SHALL auto-scroll the timeline to center the current hour in the visible area; this current time indicator SHALL appear only in Day View_Mode when displaying the current date, and SHALL NOT appear in other View_Modes or when viewing non-current dates.
7. WHILE the Calendar_Page is displaying Day View_Mode for the current date, THE Calendar_Page SHALL update the current time indicator position unconditionally every 60 seconds.

### Requirement 4: View Calendar Events in Week Mode

**User Story:** As a user, I want to view my calendar events in Week mode organized by day, so that I can see an overview of my schedule for an entire week.

#### Acceptance Criteria

1. WHILE in Week View_Mode, THE Calendar_Page SHALL display seven consecutive day blocks starting from Monday through Sunday, each consisting of a header showing the day name and date (with the current day header visually highlighted) and an event container displaying Event_Cards ordered by start time ascending.
2. WHILE in Week View_Mode, THE Calendar_Page SHALL render each Event_Card with: the background color of the calendar event, the icon and name on the first line (with a 📝 emoji appended after the name if notes exist, and the name truncated with ellipsis if it exceeds 25 characters), and start time, end time, and total hours on the second line.
3. WHILE in Week View_Mode, THE Calendar_Page SHALL provide two independent navigation controls: a Week_Navigator with previous and next buttons to shift the displayed week by 7 days backward or forward, and a Year_Navigator with previous and next buttons to shift the displayed week by exactly one year backward or forward while preserving the same ISO week number.
4. WHILE in Week View_Mode, THE Calendar_Page SHALL display only calendar events where `isDeleted` is false and the event day falls within the currently displayed Monday-to-Sunday week.
5. WHEN the user taps or clicks an Event_Card in Week View_Mode, THE Calendar_Page SHALL navigate to the Event_Detail_Page for that event.

### Requirement 5: View Calendar Events in Month Mode

**User Story:** As a user, I want to view my calendar events in Month mode, so that I can see a monthly overview with shift colors and reminder icons at a glance.

#### Acceptance Criteria

1. THE Calendar_Page in Month View_Mode SHALL display a grid of day blocks covering the full weeks that contain the current month, where days belonging to adjacent months are visible but visually dimmed, each day block consisting of a header showing the day number (with the current day distinguished by a colored circle or ring using `primary-blue`) and an event container.
2. THE Calendar_Page in Month View_Mode SHALL render the event container for each day as follows: IF a work shift calendar event exists for that day and has a background color defined, the container background color SHALL be the shift event's background color; IF a work shift calendar event exists but has no background color defined, the container background SHALL be transparent; IF no work shift exists, the container background SHALL be transparent regardless of any non-shift events' background colors present on that day. The container SHALL display the emojis (icons) of all calendar events for that day regardless of whether a work shift exists, starting with work shift events first followed by reminder events. IF the day contains more than 5 calendar events, THE Calendar_Page SHALL display the first 5 emojis and a numeric indicator showing the count of remaining events.
3. THE Calendar_Page in Month View_Mode SHALL provide two independent navigation controls: a Month_Navigator to browse to the next or previous month, and a Year_Navigator to browse to the same month in the next or previous year.
4. THE Calendar_Page in Month View_Mode SHALL display only calendar events where `isDeleted` is false and the event day falls within the currently displayed month.
5. WHEN the user taps or clicks a day block in Month View_Mode, THE Calendar_Page SHALL navigate to Day View_Mode for the selected day, displaying all events for that day ordered by start time.

### Requirement 6: View Calendar Events in Year Mode

**User Story:** As a user, I want to view my calendar events in Year mode, so that I can see a yearly overview with visual indicators for shifts and reminders.

#### Acceptance Criteria

1. THE Calendar_Page in Year View_Mode SHALL display all 12 months and their respective days for the currently displayed year, highlighting the current day with a distinct visual indicator.
2. THE Calendar_Page in Year View_Mode SHALL render each day as follows: IF the day has no work shift and no reminders linked, no visual indicators SHALL be displayed. IF the day has a work shift linked, a colored circle is displayed using the shift event's background color. IF the day has no work shift but has one or more reminders linked, the icon emoji of the first reminder ordered by start time is displayed in the upper-right corner of the day. IF the day has both a work shift and one or more reminders, both the colored circle and the icon emoji of the first reminder ordered by start time in the upper-right corner are displayed. Days without any shifts or reminders SHALL strictly prohibit any visual indicators.
3. THE Calendar_Page in Year View_Mode SHALL provide a Year_Navigator control that allows browsing to the next or previous year.
4. THE Calendar_Page in Year View_Mode SHALL display events automatically without requiring the user to activate any filter, showing any calendar event where `isDeleted` is false and the event `day` falls within the currently displayed year.
5. WHEN the user taps or clicks a day block in Year View_Mode, THE Calendar_Page SHALL navigate to the Event_Detail_Page displaying all events for that day ordered by start time in card format; IF navigation fails due to a technical issue, THE Calendar_Page SHALL display an error message and allow the user to retry manually.

### Requirement 7: Edit a Calendar Event

**User Story:** As a user, I want to edit an existing calendar event, so that I can update its details when my schedule changes.

#### Acceptance Criteria

1. WHEN the user opens the Event_Detail_Page for a calendar event, THE Event_Detail_Page SHALL display all event fields with the following editability: event type selection (editable via Event_Type_Selector), `startDay` (editable), `endDay` (editable), and notes (editable); for shift events: `startTime` and `endTime` SHALL be displayed as read-only (auto-populated from the shift definition); for reminder events: `startTime` and `endTime` SHALL be editable via timepickers; and the following as read-only derived values from the selected shift or reminder: name, icon, and background color.
2. WHEN the user modifies event fields and saves, THE Event_Store SHALL update the existing calendar event record with the new field values, recompute `totalHours` according to the event type rules, set `modifiedAt` to the current UTC timestamp, and set `syncedAt` to null, preserving the existing `id` and `isDeleted` values unchanged.
3. WHEN the user navigates away from the Event_Detail_Page without saving (via cancel action, back navigation, or any exit other than the save action), THE Event_Detail_Page SHALL discard all unsaved changes and navigate back to the Calendar_Page preserving the previous view state (selected View_Mode and navigated date).
4. WHILE the Event_Detail_Page is in edit mode, THE Event_Detail_Page SHALL enforce the same field validation rules as during event creation (required event type, startDay, endDay, start time, end time; `endDay >= startDay`; for reminders where `endDay == startDay`: `endTime > startTime`; notes maximum 250 characters; one-shift-per-day constraint for shift type events on `startDay`, excluding the event currently being edited from the constraint check).
5. WHEN the user changes the event type from reminder to shift, THE Event_Detail_Page SHALL auto-populate `startTime`, `endTime`, and `totalHours` from the new shift definition as read-only values, and SHALL apply the Crossing_Midnight_Shift rule to automatically set `endDay` to `startDay + 1` if the shift's `endTime < startTime`.
6. WHEN modifications are successfully saved, THE Event_Detail_Page SHALL navigate back to the Calendar_Page which SHALL display the updated event data.
7. IF the calendar event's referenced shift or reminder has been deleted or deactivated since the event was created, THEN THE Event_Detail_Page SHALL still display the event for editing, show the current type reference as the selected value in the Event_Type_Selector, and allow the user to change the event type to any active, non-deleted shift or reminder.

### Requirement 8: Delete a Calendar Event

**User Story:** As a user, I want to delete a calendar event I no longer need, so that I can keep my calendar clean and accurate.

#### Acceptance Criteria

1. WHEN the user activates the delete action on the Event_Detail_Page, THE Event_Detail_Page SHALL display a Confirmation_Modal that includes the name of the event and communicates the deletion is permanent, offering confirm and cancel actions.
2. WHEN the user confirms deletion in the Confirmation_Modal, THE Event_Store SHALL set the event's `isDeleted` field to true, update `modifiedAt` to the current UTC timestamp, and set `syncedAt` to null, and upon successful store update THE Event_Detail_Page SHALL dismiss the Confirmation_Modal and navigate back to the Calendar_Page.
3. WHEN the user dismisses the Confirmation_Modal by any means other than confirming (including cancelling, clicking outside the modal, or pressing the escape key), THE Event_Detail_Page SHALL dismiss the Confirmation_Modal and make no changes to the event record.
4. WHEN an event is deleted, THE Calendar_Page SHALL no longer display that event in any View_Mode.
5. IF the Event_Store fails to persist the deletion (e.g., local storage write error), THEN THE Event_Detail_Page SHALL dismiss the Confirmation_Modal, display an error message indicating the event could not be deleted, and THE Event_Store SHALL guarantee that the event record remains unchanged with all field values preserved as they were before the deletion attempt.

### Requirement 9: Event Creation Day Pre-Selection

**User Story:** As a user, I want the startDay and endDay fields to be pre-selected based on my current calendar context when creating a new event, so that I save time and avoid selecting the wrong date.

#### Acceptance Criteria

1. WHEN the user creates a new event from Day View_Mode, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the day currently being displayed on the Calendar_Page.
2. WHEN the user creates a new event from Week View_Mode and the current device date falls within the displayed week, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the current device date.
3. WHEN the user creates a new event from Week View_Mode and the current device date does not fall within the displayed week, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the first day (Monday) of the displayed week.
4. WHEN the user creates a new event from Month View_Mode and the current device date falls within the displayed month, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the current device date.
5. WHEN the user creates a new event from Month View_Mode and the current device date does not fall within the displayed month, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the first day of the displayed month.
6. WHEN the user creates a new event from Year View_Mode and the current device date falls within the displayed year, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the current device date.
7. WHEN the user creates a new event from Year View_Mode and the current device date does not fall within the displayed year, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the first day (January 1st) of the displayed year.

### Requirement 10: Calendar Event Data Synchronization

**User Story:** As a subscribed user, I want my calendar events to synchronize across all my devices, so that I have a consistent schedule regardless of which device I use.

#### Acceptance Criteria

1. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL push calendar event records where `syncedAt` is null or `modifiedAt` is greater than `syncedAt` in batches of no more than 100 records per request, and upon successful API acknowledgment SHALL set `syncedAt` to the current UTC timestamp on each pushed record; IF more than 100 records are pending, THEN THE Sync_Service SHALL send sequential push requests until all pending records have been pushed.
2. THE Event_Store SHALL include the following change tracking fields on every calendar event record: `id` (UUID, client-generated), `modifiedAt` (DateTime UTC), `syncedAt` (DateTime UTC or null), and `isDeleted` (boolean).
3. WHEN a conflict occurs during pull synchronization where the local record has `modifiedAt` greater than its `syncedAt` and the remote record has a different `modifiedAt` value for the same event ID, THE Sync_Service SHALL retain the record with the later `modifiedAt` timestamp; IF both `modifiedAt` timestamps are identical, THEN THE Sync_Service SHALL prefer and retain the remote record as the tie-breaking rule.
4. WHILE the user lacks an active subscription or connectivity is unavailable, THE Event_Store SHALL operate fully offline with all CRUD operations persisted locally and no synchronization attempts SHALL be made.
5. WHEN a pulled calendar event record does not exist in the local Event_Store, THE Sync_Service SHALL insert the remote record into the local store with `syncedAt` set to the current UTC timestamp.
6. WHEN a pulled calendar event with `eventType` "shift" conflicts with the one-shift-per-day constraint for the same calendar date, THE Sync_Service SHALL apply the last-writer-wins resolution based on `modifiedAt`, removing the local shift event for that calendar date if the remote record has a later `modifiedAt`.
7. WHEN a pulled calendar event record already exists in the local Event_Store and the local record has `modifiedAt` equal to or less than its `syncedAt` (no local modification), THE Sync_Service SHALL overwrite the local record with the remote record and set `syncedAt` to the current UTC timestamp.
8. WHEN a pulled calendar event record has `isDeleted` set to true, THE Sync_Service SHALL set `isDeleted` to true on the corresponding local record and set `syncedAt` to the current UTC timestamp; IF no corresponding local record exists, THEN THE Sync_Service SHALL insert the remote record with `isDeleted` true and `syncedAt` set to the current UTC timestamp.
9. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL request pulled records from the API modified after the client's persisted `lastSyncedAt` timestamp, paginated at a maximum of 100 records per response using a cursor; WHEN the API returns fewer than 100 records, THE Sync_Service SHALL treat the pull as complete and update `lastSyncedAt` to the current UTC timestamp; WHILE connectivity is unavailable, THE Sync_Service SHALL NOT attempt any pull requests.

### Requirement 11: Calendar Event Data Model

**User Story:** As a developer, I want a well-defined data model for calendar events, so that all platforms persist and exchange event data consistently.

#### Acceptance Criteria

1. THE Event_Store SHALL persist each calendar event with the following fields: `id` (UUID, client-generated, required), `eventType` (string, either "shift" or "reminder", required, modifiable), `eventTypeId` (UUID referencing the shift or reminder, required, modifiable), `startDay` (date in YYYY-MM-DD format, required, modifiable), `endDay` (date in YYYY-MM-DD format, required, modifiable), `startTime` (integer, minutes from midnight 0-1439, required; read-only for shifts, modifiable for reminders), `endTime` (integer, minutes from midnight 0-1439, required; read-only for shifts, modifiable for reminders), `totalHours` (integer, minutes, required, read-only — derived from shift's `hoursWorked` for shift events or calculated from startTime/endTime + day difference for reminder events), `notes` (string, maximum 250 characters, optional), `modifiedAt` (DateTime UTC, required), `syncedAt` (DateTime UTC or null), and `isDeleted` (boolean, required, defaults to false).
2. THE Event_Store SHALL derive the following display fields from the referenced shift or reminder at read time: `name` (string, maximum 50 characters), `icon` (single emoji), and `backgroundColor` (hex color from Predefined_Palette).
3. THE Event_Store SHALL generate the `id` field client-side as a UUID at the moment of record creation.
4. THE Event_Store SHALL update the `modifiedAt` field to the current UTC timestamp on every local write operation (create, update, or soft-delete).
5. THE Event_Store SHALL enforce that `endDay` is greater than or equal to `startDay` for every calendar event record.
6. THE Event_Store SHALL enforce the following time validation: for reminder events where `endDay` equals `startDay`, `endTime` MUST be strictly greater than `startTime`; for reminder events where `endDay` is greater than `startDay`, any combination of `startTime` and `endTime` values (0-1439) is valid; for shift events, no time validation is applied as times are derived from the shift definition.
7. WHEN a calendar event references a shift definition where `endTime` is less than `startTime` (Crossing_Midnight_Shift), THE Event_Store SHALL automatically set `endDay` to `startDay + 1` day.

### Requirement 12: Cross-Platform Consistency

**User Story:** As a user, I want the calendar event management experience to be consistent across the React Web and Android platforms, so that I can use either platform interchangeably.

#### Acceptance Criteria

1. THE Event_Form SHALL present the same fields, validation rules, and default behaviors on both React Web and Android platforms.
2. THE Calendar_Page SHALL display the same View_Mode options (Day, Week, Month, Year) with the same navigation controls (Day_Navigator, Month_Navigator, Year_Navigator in Day mode; Week_Navigator, Year_Navigator in Week mode; Month_Navigator, Year_Navigator in Month mode; Year_Navigator in Year mode) and event representations on both platforms, rendered using each platform's native UI components.
3. WHEN the user changes the theme setting (whether triggered manually by the user, by system automatic switching, or by any other non-user event), THE application SHALL apply the selected theme (light mode or dark mode) to all calendar event management screens without requiring an application restart on both platforms, allowing continued user interaction during the transition even if some components briefly display mixed theme styles regardless of the trigger source; WHILE no theme change is actively occurring, THE application SHALL NOT display mixed theme styles across any components.
4. WHEN the user changes the language setting, THE application SHALL render all user-facing text in the selected language (Spanish or English) immediately and without requiring an application restart on both platforms, guaranteeing that the language change takes effect on all visible text at the moment of the setting change.
5. THE Calendar_Page SHALL default to Day View_Mode when first loaded for a new user with no prior view state on both platforms; WHEN a returning user has a previously persisted view state (last-used View_Mode), THE Calendar_Page SHALL restore that persisted View_Mode instead of defaulting to Day.

### Requirement 13: User Data Isolation

**User Story:** As a user, I want to see only my own calendar events, so that my schedule remains private and I never see data from other users.

#### Acceptance Criteria

1. THE Event_Store SHALL store calendar events with ownership determined implicitly by the authenticated session and the device's local storage, such that no record contains an explicit user identifier linking it to a specific account.
2. THE Calendar_Page SHALL display only calendar events that exist in the local Event_Store, rendering zero events from any other user's dataset.
3. THE Sync_Service SHALL push and pull only calendar event records belonging to the authenticated user, and IF the backend API rejects a pushed record or returns a record not belonging to the authenticated user, THEN THE Sync_Service SHALL discard the foreign record without persisting it to the local Event_Store regardless of whether synchronization is currently active or inactive, and continue processing remaining records.
4. THE Event_Type_Selector SHALL display only shifts and reminders that exist in the local Event_Store, preventing selection of event types not owned by the current user.
5. WHEN a user signs out and a different user signs in on the same device, THE Event_Store SHALL make the previous user's locally stored data inaccessible and non-visible to the newly signed-in user, retaining it only for restoration when the original account signs back in.
6. THE Backend_API SHALL reject any sync request that attempts to read or write calendar event records not owned by the authenticated user, returning an authorization error response without exposing the existence or content of other users' data.
7. IF a free (anonymous) user operates without authentication, THEN THE Event_Store SHALL treat all local data as belonging exclusively to that device session, and THE Sync_Service SHALL remain inactive with no data transmitted to or from the backend; WHEN no anonymous user session is currently active on the device, THE Sync_Service restrictions SHALL NOT apply and the service MAY operate normally for any authenticated user.

### Requirement 14: Navigate to Today

**User Story:** As a user, I want a quick way to return to today's date from any calendar view, so that I can easily get back to the current day regardless of how far I've navigated.

#### Acceptance Criteria

1. THE Calendar_Page SHALL display a "Today" button within every date navigator component (Day, Week, Month, and Year view modes) on both platforms.
2. WHEN the user activates the "Today" button, THE Calendar_Page SHALL immediately navigate the current view to include the current device date (today), resetting the navigation position to center on today.
3. THE "Today" button SHALL be visually right-aligned within the navigator bar, styled as a compact outlined text button with primary color text.
4. THE "Today" button label SHALL be localized ("Hoy" in Spanish, "Today" in English).

### Requirement 15: Event Form Field Auto-Adjustment

**User Story:** As a user, I want the form to intelligently auto-adjust dependent fields when I change a value, so that I avoid invalid combinations and save time.

#### Acceptance Criteria

1. WHEN the user changes the `startTime` field and the current `endTime` is less than or equal to the new `startTime`, THE Event_Form SHALL silently auto-set `endTime` to `startTime + 30 minutes` (capped at 23:59).
2. WHEN the user changes the `startTime` field and the current `endTime` is already greater than the new `startTime`, THE Event_Form SHALL NOT modify `endTime`.
3. WHEN the user changes the `startDay` field and the current `endDay` is earlier than the new `startDay`, THE Event_Form SHALL silently auto-set `endDay` to equal the new `startDay`.
4. WHEN the user changes the `startDay` field and the current `endDay` is already equal to or later than the new `startDay`, THE Event_Form SHALL NOT modify `endDay`.
5. THE auto-adjustment rules SHALL apply only to editable fields — for shift events where time fields are read-only, the time auto-adjustment SHALL NOT apply.
6. THE auto-adjustments SHALL be silent (no notification, toast, or dialog) and the user SHALL be able to manually override the auto-adjusted value immediately after adjustment.
