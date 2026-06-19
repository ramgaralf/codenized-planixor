# Requirements Document

## Introduction

The Reports feature provides users with visual summaries and charts showing hours invested in each type of calendar event, grouped by shift types and reminder types. Reports operate in two modes: monthly and annual. The monthly report aggregates hours for a selected month, while the annual report aggregates hours for a selected year and optionally compares them against configured annual working hours to determine surplus or deficit. Reports are derived entirely from locally persisted calendar event data (offline-first) and are available on both React Web PWA and Android App platforms. Synchronization of the annual hours configuration follows the same offline-first sync strategy as other entities.

## Glossary

- **Reports_Page**: The main reports UI page accessible via the "Reports" navigation item that displays charts and summaries based on calendar event data.
- **Time_Range_Selector**: A segmented control on the Reports_Page allowing the user to switch between Month mode and Year mode.
- **Month_Date_Picker**: A navigation control displayed in Month mode that allows the user to select a specific month and year to display report data for.
- **Year_Date_Picker**: A navigation control displayed in Year mode that allows the user to select a specific year to display report data for.
- **Today_Button**: A button on the Reports_Page that resets the date picker selection to the current month (in Month mode) or current year (in Year mode).
- **Annual_Config_Button**: A button displayed in the top bar (in the position of the "new event" button on the Calendar page) when Year mode is active, allowing the user to configure annual working hours for the selected year.
- **Annual_Config_Modal**: A modal dialog that allows the user to set or update the required annual working hours for a specific year.
- **Annual_Hours_Config**: A persisted record storing the configured required working hours for a specific year. Contains the year, configured hours, and change tracking fields.
- **Report_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores Annual_Hours_Config records.
- **Shift_Bar_Chart**: A horizontal bar chart displaying hours per shift type, with shift icons on the y-axis, hours on the x-axis, and bars colored by each shift's configured background color.
- **Shift_Donut_Chart**: A donut chart representing the percentage distribution of hours across shift types, with total hours displayed in the center.
- **Shift_Table**: A tabular breakdown showing hours by shift type and the total.
- **Reminder_Bar_Chart**: A horizontal bar chart displaying hours per reminder type, with reminder type icons on the y-axis, hours on the x-axis, and bars colored by each reminder type's configured background color.
- **Reminder_Donut_Chart**: A donut chart representing the percentage distribution of hours across reminder types, with total hours displayed in the center.
- **Reminder_Table**: A tabular breakdown showing hours by reminder type and the total.
- **Calendar_Event**: A scheduled occurrence referencing either a Shift or Reminder definition, containing startDay, endDay, startTime, endTime, totalHours, eventType, and eventTypeId.
- **Shift**: A work shift definition containing id, name, icon, backgroundColor, startTime, endTime, hoursWorked, and other metadata.
- **Reminder**: A reminder definition containing id, name, icon, backgroundColor, and other metadata.
- **Sync_Service**: The cross-cutting synchronization module responsible for pushing and pulling Annual_Hours_Config records to/from the backend API for subscribed users.
- **Backend_API**: The .NET 10 REST API that serves as the synchronization hub for subscribed users.

## Requirements

### Requirement 1: Reports Page Navigation and Layout

**User Story:** As a user, I want to access a Reports page from the main navigation with mode selection and date navigation, so that I can view hour summaries for specific time periods.

#### Acceptance Criteria

1. THE Reports_Page SHALL be accessible via the "Reports" navigation item in the sidebar (web desktop/tablet) or bottom navigation (web mobile and Android), positioned second in the navigation order after Calendar.
2. THE Reports_Page SHALL display a Time_Range_Selector as a segmented control (two options: Month and Year) that allows the user to switch between Month mode and Year mode, with Month mode selected by default on first access within a session.
3. WHEN Month mode is selected in the Time_Range_Selector, THE Reports_Page SHALL display a Month_Date_Picker consisting of left/right navigation arrows and a month-year label (e.g., "June 2025" / "Junio 2025"), defaulting to the current month and year, navigable within the range of 10 years in the past to the current year.
4. WHEN Year mode is selected in the Time_Range_Selector, THE Reports_Page SHALL display a Year_Date_Picker consisting of left/right navigation arrows and a year label (e.g., "2025"), defaulting to the current year, navigable within the range of 10 years in the past to the current year.
5. THE Reports_Page SHALL display a Today_Button right-aligned within the date navigator bar that, WHEN activated in Month mode, resets the Month_Date_Picker to the current month and year, and WHEN activated in Year mode, resets the Year_Date_Picker to the current year.
6. WHEN the user switches from Month mode to Year mode, THE Reports_Page SHALL preserve the year from the previously selected month as the selected year in the Year_Date_Picker. WHEN the user switches from Year mode to Month mode, THE Reports_Page SHALL remember and restore the original month that was selected before switching to Year mode (not reset to January or any default month).
7. WHEN Year mode is selected, THE Reports_Page SHALL display an Annual_Config_Button in the top bar (in the same position where the "new event" button appears on the Calendar page) to allow configuration of annual working hours for the selected year.
8. WHEN Month mode is selected, THE Reports_Page SHALL NOT display the Annual_Config_Button in the top bar.
9. THE Reports_Page SHALL NOT render its own page title heading; the page title SHALL be displayed exclusively by the global top bar.

### Requirement 2: Monthly Report — Shifts Section

**User Story:** As a user, I want to see a visual breakdown of hours spent on each shift type for a selected month, so that I can understand how my work time is distributed across shift types.

#### Acceptance Criteria

1. WHEN Month mode is selected and calendar events with `eventType` "shift" exist for the selected month, THE Reports_Page SHALL display a Shifts Section containing a Shift_Bar_Chart, a Shift_Donut_Chart, and a Shift_Table arranged in the following layout order: Shift_Bar_Chart first, Shift_Donut_Chart second, and Shift_Table third.
2. WHEN Month mode is selected and no calendar events with `eventType` "shift" and `isDeleted` false exist for the selected month, THE Reports_Page SHALL hide the Shifts Section entirely (no chart containers, no table, no section heading rendered).
3. THE Shift_Bar_Chart SHALL display a horizontal bar for each shift type that has at least one calendar event in the selected month, with the shift's emoji icon on the y-axis label, total hours formatted as "{X}h {Y}m" on or beside the bar, the x-axis representing hours starting at 0, and each bar rendered in the `backgroundColor` hex color configured for that shift type.
4. THE Shift_Bar_Chart SHALL order bars from the shift type with the most total hours at the top to the shift type with the fewest total hours at the bottom.
5. THE Shift_Donut_Chart SHALL display one segment per shift type colored with that shift type's `backgroundColor`, where each segment's arc size represents the percentage of that shift type's total hours relative to the combined total shift hours for the month (all segments summing to 100% since percentages are calculated relative to the total), and SHALL display the combined total hours from all shift types formatted as "{X}h {Y}m" in the center of the donut.
6. IF a shift type's percentage in the Shift_Donut_Chart is less than 1% but greater than 0%, THEN THE Shift_Donut_Chart SHALL display that segment as 1% minimum arc size to ensure visibility.
7. THE Shift_Table SHALL display one row per shift type showing: the shift's emoji icon, shift name, and total hours for that type formatted as "{X}h {Y}m", followed by a final summary row showing the label "Total" and the grand total of all shift hours for the month formatted as "{X}h {Y}m".
8. THE Shift_Table SHALL order rows alphabetically by shift name.
9. WHEN calculating monthly shift hours, IF a shift event has a `startDay` in the selected month, THE Reports_Page SHALL include the full `totalHours` of that event in the selected month's totals regardless of the event's `endDay`.
10. THE Reports_Page SHALL aggregate shift data only from calendar events where `isDeleted` is false and `eventType` is "shift".
11. WHEN converting `totalHours` (stored in minutes) to display format, THE Reports_Page SHALL compute hours as `floor(totalHours / 60)` and minutes as `totalHours mod 60`, displaying the result as "{hours}h {minutes}m" (e.g., 150 minutes displays as "2h 30m", 60 minutes displays as "1h 0m", 45 minutes displays as "0h 45m").

### Requirement 3: Monthly Report — Reminders Section

**User Story:** As a user, I want to see a visual breakdown of hours spent on each reminder type for a selected month, so that I can understand how my time is distributed across reminder activities.

#### Acceptance Criteria

1. WHEN Month mode is selected and calendar events with `eventType` "reminder" exist for the selected month, THE Reports_Page SHALL display a Reminders Section containing a Reminder_Bar_Chart, a Reminder_Donut_Chart, and a Reminder_Table.
2. WHEN Month mode is selected and no calendar events with `eventType` "reminder" and `isDeleted` false exist for the selected month, THE Reports_Page SHALL hide the Reminders Section entirely.
3. THE Reminder_Bar_Chart SHALL display a horizontal bar for each reminder type that has at least one calendar event in the selected month, with the reminder's emoji icon on the y-axis, total hours formatted as "{X}h {Y}m" on the x-axis, and each bar rendered in the `backgroundColor` configured for that reminder type.
4. THE Reminder_Bar_Chart SHALL order reminder types by total hours descending (highest hours at the top).
5. THE Reminder_Donut_Chart SHALL display one segment per reminder type colored with its configured `backgroundColor`, sized proportionally to that type's hours relative to total reminder hours for the month (all segments summing to 100%), and SHALL display the total combined hours from all reminder types formatted as "{X}h {Y}m" in the center of the donut.
6. IF a reminder type contributes less than 1% of total reminder hours, THEN THE Reminder_Donut_Chart SHALL still render a visible segment for that type (minimum arc width of 1% of the circle).
7. THE Reminder_Table SHALL display one row per reminder type showing the reminder emoji icon, reminder name, and total hours formatted as "{X}h {Y}m", ordered by total hours descending, followed by a final summary row showing the label "Total" and the grand total of all reminder hours for the month formatted as "{X}h {Y}m".
8. WHEN calculating monthly reminder hours, IF a reminder event has a `startDay` in the selected month, THE Reports_Page SHALL include the full `totalHours` of that event in the selected month's totals regardless of the event's `endDay`.
9. THE Reports_Page SHALL aggregate reminder data only from calendar events where `isDeleted` is false and `eventType` is "reminder".
10. WHEN a reminder definition referenced by `eventTypeId` has been soft-deleted (`isDeleted` true), THE Reports_Page SHALL still display that reminder's data in the charts and table using the reminder's last known name, icon, and backgroundColor.
11. THE Reports_Page SHALL convert `totalHours` (stored in minutes) to the display format "{X}h {Y}m" where X is the integer quotient of minutes divided by 60 and Y is the remainder (e.g., 150 minutes displays as "2h 30m", 45 minutes displays as "0h 45m").

### Requirement 4: Monthly Report — Empty State

**User Story:** As a user, I want to see a clear message when no report data is available for a selected month, so that I understand there is nothing to display rather than thinking the page is broken.

#### Acceptance Criteria

1. WHEN Month mode is selected and no calendar events exist where `isDeleted` equals false and `startDay` falls within the first and last day (inclusive) of the selected month for either shift or reminder event types, THE Reports_Page SHALL hide all chart sections and SHALL display a centered localized empty-state message ("No data to display" / "Sin datos para mostrar") within the chart content area.
2. WHEN Month mode is selected and non-deleted calendar events exist only for shift types (no non-deleted reminder events with `startDay` in the selected month), THE Reports_Page SHALL display the Shifts Section and SHALL NOT display the Reminders Section or the empty-state message.
3. WHEN Month mode is selected and non-deleted calendar events exist only for reminder types (no non-deleted shift events with `startDay` in the selected month), THE Reports_Page SHALL display the Reminders Section and SHALL NOT display the Shifts Section or the empty-state message.
4. WHEN the empty-state message is displayed, THE Reports_Page SHALL mark the message container with an accessible role (status region) so that screen readers announce the empty state to the user.

### Requirement 5: Annual Report — Shifts Section

**User Story:** As a user, I want to see a visual breakdown of hours spent on each shift type for a selected year, so that I can understand my annual work time distribution and track progress toward annual targets.

#### Acceptance Criteria

1. WHEN Year mode is selected and calendar events with `eventType` "shift" exist for the selected year, THE Reports_Page SHALL display a Shifts Section containing a Shift_Bar_Chart, a Shift_Donut_Chart, and a Shift_Table.
2. WHEN Year mode is selected and no calendar events with `eventType` "shift" and `isDeleted` false exist for the selected year, THE Reports_Page SHALL NOT display the Shifts Section.
3. THE Shift_Bar_Chart SHALL display a horizontal bar for each shift type that has at least one calendar event in the selected year, with shift icons on the y-axis, total hours (formatted as "{X}h {Y}m") on the x-axis, and each bar rendered in the background color configured for that shift type; shift types SHALL be ordered from highest total hours to lowest.
4. WHEN annual working hours are NOT configured for the selected year, THE Shift_Donut_Chart SHALL display the percentage of each shift type relative to the total shift hours for the year (all shift types summing to 100%), with each percentage rounded to one decimal place, and SHALL display the total combined hours from all shift types in the center of the donut formatted as "{X}h {Y}m".
5. WHEN annual working hours ARE configured for the selected year, THE Shift_Donut_Chart SHALL display the percentage of each shift type where 100% represents the total configured working hours for that year (individual shift type percentages may exceed 100% if actual hours surpass configured hours), with each percentage rounded to one decimal place, and SHALL display the total combined shift hours versus the configured working hours in the center of the donut formatted as "{actual}h / {configured}h" where both values are whole hours rounded down from minutes.
6. WHEN annual working hours are NOT configured, THE Shift_Table SHALL display one row per shift type showing the shift name, icon, and total hours for that type formatted as "{X}h {Y}m", ordered from highest total hours to lowest, and a final row showing the grand total of all shift hours for the year formatted as "{X}h {Y}m".
7. WHEN annual working hours ARE configured, THE Shift_Table SHALL display one row per shift type showing the shift name, icon, and total hours for that type formatted as "{X}h {Y}m", ordered from highest total hours to lowest, followed by a row showing the grand total of all shift hours formatted as "{X}h {Y}m", a row showing the configured annual working hours formatted as "{X}h {Y}m", and a row showing the difference formatted as "{X}h {Y}m"; IF total shift hours are greater than or equal to the configured hours, THEN the difference row text SHALL be rendered in green (#10B981); IF total shift hours are less than the configured hours, THEN the difference row text SHALL be rendered in red.
8. WHEN calculating annual shift hours, IF a shift event has a `startDay` in the selected year, THE Reports_Page SHALL include the full `totalHours` of that event in the selected year's totals regardless of the event's `endDay`.
9. THE Reports_Page SHALL aggregate shift data only from calendar events where `isDeleted` is false and `eventType` is "shift".
10. THE Reports_Page SHALL compute all hour values by converting `totalHours` (stored in minutes) to hours and minutes, where hours = floor(totalMinutes / 60) and minutes = totalMinutes mod 60, displayed as "{X}h {Y}m" (e.g., 150 minutes → "2h 30m", 60 minutes → "1h 0m").

### Requirement 6: Annual Report — Reminders Section

**User Story:** As a user, I want to see a visual breakdown of hours spent on each reminder type for a selected year, so that I can understand my annual time investment in reminder activities.

#### Acceptance Criteria

1. WHEN Year mode is selected and calendar events with `eventType` "reminder" exist for the selected year, THE Reports_Page SHALL display a Reminders Section containing a Reminder_Bar_Chart, a Reminder_Donut_Chart, and a Reminder_Table.
2. WHEN Year mode is selected and no calendar events with `eventType` "reminder" and `isDeleted` false exist for the selected year, THE Reports_Page SHALL not display the Reminders Section. Note: the Reminders Section SHALL be displayed whenever at least one non-deleted calendar event with `eventType` "reminder" and `startDay` in the selected year exists, even if all such events have `totalHours` equal to zero.
3. THE Reminder_Bar_Chart SHALL display a horizontal bar for each reminder type that has at least one calendar event in the selected year, with the reminder type emoji icon and name on the y-axis, total hours (formatted as "{X}h {Y}m") on the x-axis, each bar rendered in the background color configured for that reminder type, and bars sorted in descending order by total hours (highest hours at top).
4. THE Reminder_Donut_Chart SHALL display the percentage of each reminder type relative to the total reminder hours for the year (all reminder types summing to 100%) with percentages rounded to one decimal place, and SHALL display the total combined hours from all reminder types formatted as "{X}h {Y}m" in the center of the donut.
5. IF only one reminder type has events in the selected year, THEN THE Reminder_Donut_Chart SHALL display that type as exactly 100.0% occupying the full donut, regardless of intermediate calculation or rounding results (no artifacts such as 99.9% or 100.1%).
6. THE Reminder_Table SHALL display one row per reminder type showing the reminder emoji icon, reminder name, and total hours for that type formatted as "{X}h {Y}m", rows sorted in descending order by total hours, and a final row showing the grand total of all reminder hours for the year.
7. WHEN calculating annual reminder hours, IF a reminder event has a `startDay` in the selected year, THE Reports_Page SHALL include the full `totalHours` of that event in the selected year's totals regardless of the event's `endDay`.
8. THE Reports_Page SHALL aggregate reminder data only from calendar events where `isDeleted` is false and `eventType` is "reminder".
9. WHEN converting `totalHours` (stored in minutes) for display, THE Reports_Page SHALL compute hours as `floor(totalMinutes / 60)` and remaining minutes as `totalMinutes mod 60`, and display in the format "{X}h {Y}m" (e.g., 90 minutes displays as "1h 30m", 45 minutes displays as "0h 45m").

### Requirement 7: Annual Report — Empty State

**User Story:** As a user, I want to see a clear message when no report data is available for a selected year, so that I understand there is nothing to display.

#### Acceptance Criteria

1. WHEN Year mode is selected and no non-deleted calendar events exist with `startDay` in the selected year for shift event types nor for reminder event types, THE Reports_Page SHALL display a localized empty-state message ("No data to display" / "Sin datos para mostrar") centered in the chart content area, replacing all chart sections (Shifts Section and Reminders Section).
2. WHEN Year mode is selected and non-deleted calendar events exist only for shift types (none for reminder types) within the selected year, THE Reports_Page SHALL display the Shifts Section and SHALL NOT display the Reminders Section or the empty-state message.
3. WHEN Year mode is selected and non-deleted calendar events exist only for reminder types (none for shift types) within the selected year, THE Reports_Page SHALL display the Reminders Section and SHALL NOT display the Shifts Section or the empty-state message.
4. WHEN the user navigates to a different year via the date navigator, THE Reports_Page SHALL re-evaluate the event data for the newly selected year and update the display within 500 milliseconds, showing or hiding the empty-state message and chart sections according to criteria 1–3.

### Requirement 8: Annual Hours Configuration

**User Story:** As a user, I want to configure the required annual working hours for a specific year, so that the annual report can calculate whether I have a surplus or deficit of worked hours.

#### Acceptance Criteria

1. WHILE the Reports_Page is in Year view mode, THE Reports_Page SHALL display the Annual_Config_Button in the top bar; WHILE the Reports_Page is in Month view mode, THE Reports_Page SHALL hide the Annual_Config_Button.
2. WHEN the user activates the Annual_Config_Button, THE Reports_Page SHALL display an Annual_Config_Modal for the currently selected year.
3. THE Annual_Config_Modal SHALL contain a numeric input field for annual working hours (positive integer, minimum 1, maximum 8784), a save button, and a cancel button.
4. THE Annual_Config_Modal numeric input field SHALL accept only digit characters (0–9) and SHALL prevent entry of letters, special characters, decimal points, or negative signs.
5. WHEN no Annual_Hours_Config record exists for the selected year, THE Annual_Config_Modal SHALL display the hours input field as empty with a placeholder showing an example value (e.g., "1800").
6. WHEN an Annual_Hours_Config record exists for the selected year, THE Annual_Config_Modal SHALL pre-populate the hours input field with the previously saved value.
7. WHEN the user submits the Annual_Config_Modal with a valid hours value, THE Report_Store SHALL persist an Annual_Hours_Config record with the year, configured hours value, `modifiedAt` set to the current UTC timestamp, and `syncedAt` set to null; IF a record already exists for that year, THE Report_Store SHALL update it preserving its existing `id`.
8. WHEN the user submits the Annual_Config_Modal with an empty value (clearing a previously configured value), THE Report_Store SHALL delete the Annual_Hours_Config record for that year by setting `isDeleted` to true, `modifiedAt` to the current UTC timestamp, and `syncedAt` to null.
9. WHEN the Annual_Config_Modal is successfully saved or cleared, THE Reports_Page SHALL dismiss the modal and refresh the annual report charts to reflect the updated configuration without requiring manual page reload or navigation.
10. WHEN the user dismisses the Annual_Config_Modal by any means other than saving (including cancelling, clicking outside the modal, or pressing the escape key), THE Reports_Page SHALL dismiss the modal without persisting any changes. IF the user simultaneously triggers a submit and a dismiss action (e.g., clicking save then immediately pressing escape), THEN THE Annual_Config_Modal SHALL prioritize the submit action, completing the save operation before dismissing.
11. IF the user enters a value less than 1 or greater than 8784, THEN THE Annual_Config_Modal SHALL prevent submission and display a localized validation error message indicating the allowed range (1–8784).
12. IF the user submits the Annual_Config_Modal with the input field empty and no prior Annual_Hours_Config record exists for that year, THEN THE Annual_Config_Modal SHALL dismiss without persisting any changes (no-op).

### Requirement 9: Annual Hours Configuration Data Model

**User Story:** As a developer, I want a well-defined data model for annual hours configuration, so that all platforms persist and exchange this data consistently.

#### Acceptance Criteria

1. THE Report_Store SHALL persist each Annual_Hours_Config record with the following fields: `id` (UUID, client-generated, required), `year` (integer, the calendar year this configuration applies to, required, range 2000–2100), `configuredHours` (integer, the total required annual working hours in whole hours, required, range 1–8784), `modifiedAt` (DateTime UTC, required), `syncedAt` (DateTime UTC or null), and `isDeleted` (boolean, required, defaults to false).
2. THE Report_Store SHALL enforce a universal database-level uniqueness constraint ensuring that only one non-deleted Annual_Hours_Config record exists per year at any point in time; this constraint SHALL prevent any two non-deleted records from having the same `year` value regardless of the operation that creates them (including sync inserts); IF a record already exists for the specified year, THEN THE Report_Store SHALL update the existing record's `configuredHours`, `modifiedAt`, and `syncedAt` fields rather than creating a duplicate.
3. THE Report_Store SHALL generate the `id` field client-side as a UUID at the moment of record creation.
4. THE Report_Store SHALL update the `modifiedAt` field to the current UTC timestamp on every local write operation (create, update of `configuredHours`, or soft-delete) and SHALL set `syncedAt` to null on that same write to mark the record as pending synchronization.
5. THE Report_Store SHALL use identical field names, types, and constraints for Annual_Hours_Config across all platform stores (IndexedDB on React Web, SQLite on Android, and PostgreSQL on the backend API), ensuring that serialized records are interchangeable during synchronization without transformation beyond platform-native type mapping (e.g., INTEGER for boolean in SQLite).
6. IF a create or update operation supplies a `year` value outside the range 2000–2100 or a `configuredHours` value outside the range 1–8784, THEN THE Report_Store SHALL reject the operation and preserve the existing record state unchanged.

### Requirement 10: Annual Hours Configuration Synchronization

**User Story:** As a subscribed user, I want my annual hours configuration to synchronize across all my devices, so that my annual targets are consistent regardless of which device I use.

#### Acceptance Criteria

1. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL push Annual_Hours_Config records where `syncedAt` is null or `modifiedAt` is greater than `syncedAt` in batches of no more than 100 records per request, and upon successful API acknowledgment SHALL set `syncedAt` to the current UTC timestamp on each pushed record; IF more than 100 records are pending push, THEN THE Sync_Service SHALL send multiple sequential push requests until all pending records are pushed.
2. WHEN a conflict occurs during pull synchronization where the local Annual_Hours_Config record has `modifiedAt` greater than its `syncedAt` and the remote record has a different `modifiedAt` value for the same record ID, THE Sync_Service SHALL retain the record with the later `modifiedAt` timestamp; IF both `modifiedAt` timestamps are identical, THEN THE Sync_Service SHALL prefer and retain the remote record.
3. WHILE the user lacks an active subscription or connectivity is unavailable, THE Sync_Service SHALL operate fully offline with all Annual_Hours_Config operations persisted to the local store and no synchronization network requests SHALL be attempted.
4. WHEN a pulled Annual_Hours_Config record does not exist in the local store, THE Sync_Service SHALL insert the remote record into the local store with `syncedAt` set to the current UTC timestamp.
5. WHEN a pulled Annual_Hours_Config record has `isDeleted` set to true, THE Sync_Service SHALL set `isDeleted` to true on the corresponding local record and set `syncedAt` to the current UTC timestamp.
6. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL pull Annual_Hours_Config records from the API modified after the client's persisted `lastSyncedAt` timestamp in pages of no more than 100 records per response; IF the API returns exactly 100 records, THEN THE Sync_Service SHALL send subsequent pull requests using the pagination cursor until fewer than 100 records are returned, and upon completing all pull pages SHALL update the client's `lastSyncedAt` to the current UTC timestamp.
7. IF a push request fails due to a network error or non-success API response (5xx server errors), THEN THE Sync_Service SHALL stop the current push cycle without updating `syncedAt` on any records in the failed batch, leaving those records eligible for the next sync cycle.
8. IF a push request fails due to a validation error or business logic rejection (4xx status codes such as 400 Bad Request or 422 Unprocessable Entity), THEN THE Sync_Service SHALL treat those records as successfully synced, update their `syncedAt` to the current UTC timestamp, and continue the push cycle with remaining batches.

### Requirement 11: Report Data Reactivity

**User Story:** As a user, I want the report charts and tables to update automatically when I change the selected month or year, so that I always see data for my current selection without manual refresh.

#### Acceptance Criteria

1. WHEN the user changes the selected month in the Month_Date_Picker, THE Reports_Page SHALL recalculate and re-render all visible chart sections (Shifts Section and Reminders Section) using calendar event data whose `startDay` falls within the first day through the last day (inclusive) of the newly selected month, completing the update within 200 milliseconds of the selection change.
2. WHEN the user changes the selected year in the Year_Date_Picker, THE Reports_Page SHALL recalculate and re-render all visible chart sections (Shifts Section and Reminders Section) using calendar event data whose `startDay` falls within January 1 through December 31 (inclusive) of the newly selected year and the Annual_Hours_Config for that year, completing the update within 200 milliseconds of the selection change.
3. WHEN the user activates the Today_Button or navigates via the arrow controls to a period that happens to be the current month (in Month mode) or current year (in Year mode), THE Reports_Page SHALL set the date picker to that period and recalculate all visible chart sections using the resulting period's data, targeting completion within 200 milliseconds but allowing stale content from the previous period to remain visible until the update completes if the target cannot be met.
4. WHEN the Reports_Page recalculates chart sections for a selected period and no calendar events exist within that period, THE Reports_Page SHALL display the empty state indicator instead of rendering charts with zero values. DURING transitions between periods, both the empty state indicator and chart elements from the previous period MAY be briefly visible simultaneously before the final state resolves.
5. WHILE the Reports_Page is transitioning between periods (excluding transitions to the current period as described in criterion 3), THE Reports_Page SHALL NOT display data from the previously selected period — the chart sections SHALL either show the new period's data or the empty state indicator, with no intermediate stale content visible to the user. Transitions to the current period (via Today_Button or arrow navigation arriving at the current month/year) are exempt from this rule: stale content from the previous period MAY remain visible until the update completes.

### Requirement 12: Cross-Platform Consistency

**User Story:** As a user, I want the reports experience to be consistent across the React Web and Android platforms, so that I can use either platform interchangeably.

#### Acceptance Criteria

1. THE Reports_Page SHALL present the same Time_Range_Selector options (Month and Year), date navigation controls (left/right arrows, month-year or year label), Today_Button, and Annual_Config_Button on both React Web and Android platforms, such that each control triggers the same logical action regardless of platform.
2. THE Reports_Page SHALL display the same chart types (horizontal bar charts and donut charts) and table breakdowns on both platforms, computing identical numerical totals and percentages given the same underlying local data set.
3. THE Reports_Page SHALL use chart colors exclusively from the shift or reminder type's configured `backgroundColor` values for bars and donut segments on both platforms.
4. THE Reports_Page SHALL support both light mode and dark mode themes on both platforms, rendering chart backgrounds, axis labels, legend text, and card borders using the corresponding theme tokens defined in the global color palette (light mode: `neutral-light` backgrounds, `text-primary-light` text; dark mode: `surface-dark` backgrounds, `text-primary-dark` text).
5. THE Reports_Page SHALL display all user-facing text using localized strings (Spanish and English) on both platforms.
6. THE Annual_Config_Modal SHALL present the same fields, validation rules, and behavior on both platforms, and SHALL use identical modal presentation as a centered dialog on both platforms; platform-specific alternatives (such as bottom sheets on Android) SHALL NOT be used.

### Requirement 13: Report Hour Display Format

**User Story:** As a user, I want hours displayed in a human-readable format throughout the reports, so that I can quickly understand time durations without mental calculation.

#### Acceptance Criteria

1. THE Reports_Page SHALL explicitly apply the "{X}h {Y}m" format as a distinct formatting step to all hour values in reports, where X is the integer result of floor(totalMinutes / 60) and Y is the integer result of totalMinutes mod 60 (e.g., "8h 30m" for 510 minutes, "0h 45m" for 45 minutes, "1h 0m" for 60 minutes); the formatting SHALL NOT rely on implicit calculation behavior but SHALL be implemented as a dedicated formatter function applied after aggregation.
2. WHEN the total minutes for a type or grand total is zero, THE Reports_Page SHALL display "0h 0m".
3. THE Reports_Page SHALL compute hour values from the `totalHours` field (stored as a non-negative integer representing minutes) of each calendar event record.
4. THE Reports_Page SHALL apply the "{X}h {Y}m" format consistently across all report display contexts: bar chart axis labels, bar chart tooltip values, donut chart center text, table cell values, and the annual surplus/deficit row.
5. IF the `totalHours` field of a calendar event record contains a negative value or is zero, THEN THE Reports_Page SHALL treat it as zero for display purposes and render "0h 0m".
