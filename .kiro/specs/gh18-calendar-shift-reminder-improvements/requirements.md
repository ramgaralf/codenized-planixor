# Requirements Document

## Introduction

Calendar, Shift, and Reminder Improvements addresses three categories of enhancements to Planixor: relaxing shift and reminder-type calendar event hours validation to allow 0 and 24 hours, reinforcing correct day pre-selection when creating events from Day View, and introducing a propagation mechanism that detects when a shift or reminder template is modified and offers to update all affected calendar events for the current year. These improvements apply to both the React Web PWA and Android App, maintaining the offline-first architecture.

## Glossary

- **Shift**: A named work period definition containing name, icon, background color, start time, end time, and hours worked. Used as a template for calendar event creation.
- **Reminder**: A named reminder definition containing a name, icon, and background color. Used as a template for calendar event creation.
- **Calendar_Event**: A scheduled occurrence spanning one or more days and a time range, linked to either a Shift or Reminder type.
- **Shift_Form**: The UI component used for both creating and editing a shift, containing all configurable fields.
- **Event_Form**: The UI component used for both creating and editing a calendar event.
- **Event_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all calendar event records.
- **Shift_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all shift records.
- **Reminder_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all reminder records.
- **Hours_Worked**: The duration value representing actual working hours for a shift, stored in minutes.
- **Total_Hours**: A computed field on calendar events representing total duration in minutes. For shift events, derived from the shift's Hours_Worked field. For reminder events, calculated from startTime/endTime + day difference.
- **Propagation_Modal**: A dialog that asks the user whether to propagate template changes to existing calendar events for the current year.
- **Calendar_Page**: The main calendar UI page that displays events in the selected view mode.
- **Current_Year**: The calendar year in which the modification is made (January 1 through December 31 of the year containing today's date), used to scope propagation of template changes.

## Requirements

### Requirement 1: Relax Shift Hours_Worked Minimum to Zero

**User Story:** As a user, I want to set a shift's hours worked to 0, so that I can define shifts representing on-call periods, rest days, or placeholder shifts with no billable hours.

#### Acceptance Criteria

1. THE Shift_Form SHALL validate that the Hours_Worked field contains an integer value between 0 minutes and 1440 minutes inclusive, allowing zero as a valid minimum.
2. WHEN the user manually sets Hours_Worked to 0 minutes, THE Shift_Form SHALL accept the value without displaying a validation error and SHALL allow form submission.
3. WHEN the user sets start time equal to end time, THE Shift_Form SHALL compute Hours_Worked as 1440 minutes (24 hours), consistent with the existing special-case behavior for equal start and end times.
4. WHEN the user manually overrides Hours_Worked to 0 after auto-calculation, THE Shift_Form SHALL retain 0 as the Hours_Worked value without recalculating from start and end times. WHEN the user subsequently modifies either start time or end time, THE Shift_Form SHALL discard the manual override and replace Hours_Worked with the newly calculated value derived from the updated start and end times.
5. THE Shift_Store (IndexedDB on web, SQLite on Android, and the backend database) SHALL persist shift records with Hours_Worked set to 0 minutes without rejecting the value.
6. THE auto-calculation formula SHALL produce a value between 1 and 1440 minutes (never 0). IF Hours_Worked is 0, THEN it was explicitly set by the user via manual input.

### Requirement 2: Allow Shift Hours_Worked of Exactly 24 Hours

**User Story:** As a user, I want to set a shift's hours worked to exactly 24 hours, so that I can define full-day shifts covering an entire day.

#### Acceptance Criteria

1. THE Shift_Form SHALL accept 24 hours (1440 minutes) as a valid Hours_Worked value when the user manually overrides the Hours_Worked field, enabling form submission without displaying a validation error.
2. WHEN the user sets start time equal to end time, THE Shift_Form SHALL compute Hours_Worked as 24 hours (1440 minutes) automatically and display it formatted as "24h 0m" without setting the manual override flag, so that subsequent changes to start time or end time will trigger recalculation.
3. THE Shift_Store SHALL persist shift records with Hours_Worked set to 1440 minutes without rejecting the value, and both React Web (IndexedDB) and Android (SQLite) platforms SHALL store and retrieve the value identically.
4. IF the user attempts to set Hours_Worked to a value exceeding 1440 minutes via manual override, THEN THE Shift_Form SHALL reject the value and display a validation error message indicating the maximum allowed value is 24 hours (1440 minutes).

### Requirement 3: Allow Reminder-Type Calendar Event Total Hours of Zero

**User Story:** As a user, I want to create a reminder-type calendar event with a total duration of 0 hours, so that I can schedule point-in-time reminders without an associated duration.

#### Acceptance Criteria

1. WHEN the user creates or edits a reminder-type calendar event and sets `startTime` equal to `endTime` on the same `startDay` and `endDay`, THE Event_Form SHALL compute `totalHours` as 0 minutes and accept the combination as valid without displaying a time validation error.
2. THE Event_Form SHALL relax the existing `validateTimeForReminder` function for reminder events so that when `endDay` equals `startDay`, `endTime` MAY be equal to `startTime` (producing 0 total hours), in addition to being strictly greater than `startTime`. The validation SHALL continue to reject combinations where `endTime` is strictly less than `startTime` on the same day.
3. THE Event_Store SHALL persist calendar event records with `totalHours` set to 0 minutes without rejecting the value. The `validateRequiredFields` function SHALL accept `totalHours` of 0 as a valid numeric value (not treated as missing/falsy).
4. WHEN a reminder-type event has `totalHours` equal to 0, THE Calendar_Page SHALL display the duration as `"0m"` in Day and Week view modes, consistent with the existing `formatDuration` output when the time difference is 0 (hours === 0 branch returns `"${minutes}m"`).
5. IF a reminder-type event has `startTime` equal to `endTime` on the same day, THEN THE Event_Form auto-adjustment rule (Rule 1 from `global-calendar-event-form-rules`) SHALL NOT trigger an end-time correction, since the end time is not earlier than the start time — it is equal and now valid for reminders.

### Requirement 4: Allow Reminder-Type Calendar Event Total Hours of 24

**User Story:** As a user, I want to create a reminder-type calendar event spanning a full 24 hours, so that I can schedule all-day reminders.

#### Acceptance Criteria

1. WHEN the user creates or edits a reminder-type calendar event with `endDay` greater than `startDay`, THE Event_Form SHALL allow any combination of `startTime` and `endTime` where both values are integers in the range 0–1439, including combinations where `endTime` is less than or equal to `startTime`, and SHALL compute `totalHours` using the formula `dayDifference × 1440 + (endTime − startTime)`.
2. WHEN the user creates or edits a reminder-type calendar event with `endDay` equal to `startDay + 1 day` and `startTime` equal to `endTime` (both set to the same value in the range 0–1439), THE Event_Form SHALL compute `totalHours` as exactly 1440 minutes (24 hours).
3. WHEN the user creates or edits a reminder-type calendar event with `startTime` set to 0 and `endTime` set to 1439 on the same `startDay` and `endDay`, THE Event_Form SHALL compute `totalHours` as 1439 minutes.
4. THE Event_Store SHALL persist calendar event records with `totalHours` values of 1440 minutes or greater (as produced by multi-day reminder events) without rejecting the value.

### Requirement 5: Day View Event Creation Pre-Selects Displayed Day

**User Story:** As a user, I want the event creation form to pre-select the day I am currently viewing when I create an event from Day View, so that I do not need to manually select the date.

#### Acceptance Criteria

1. WHEN the user triggers new event creation while Day_View_Mode is active, THE Event_Form SHALL pre-select both `startDay` and `endDay` fields with the day currently displayed in the Day_View_Mode, regardless of the creation trigger used (top bar button on React Web, FAB on Android), on both platforms.
2. WHEN the user navigates to a different day using the Day_Navigator, Month_Navigator, or Year_Navigator and then creates a new event, THE Event_Form SHALL pre-select both `startDay` and `endDay` with the navigated-to day that is currently displayed, not the current device date.
3. IF no navigation has occurred since opening the Calendar_Page in Day_View_Mode, THEN THE Event_Form SHALL pre-select both `startDay` and `endDay` with today's date (the device's current date), since Day_View_Mode defaults to today on initial load.
4. WHEN the Event_Form pre-selects day fields from Day_View_Mode, THE Event_Form SHALL still apply default time pre-population rules (start time rounded up to next 30-minute mark, end time = start time + 60 minutes, capped at 23:59) independently of the day pre-selection.
5. THE Event_Form day pre-selection behavior from Day_View_Mode SHALL produce the same pre-selected date values on both React Web and Android platforms.

### Requirement 6: Propagate Shift Template Changes to Calendar Events

**User Story:** As a user, I want the system to detect when I modify a shift that is used in calendar events and ask me whether to update those events, so that my calendar stays consistent with my shift definitions without manually editing each event.

#### Acceptance Criteria

1. WHEN the user saves modifications to a shift's `startTime`, `endTime`, or `totalHours` fields, and that shift is referenced by one or more non-deleted calendar events in the Event_Store whose `startDay` falls within the Current_Year (January 1 through December 31 of the year containing today's date), THE Shift_Form SHALL display a Propagation_Modal asking the user if they want to update all affected calendar events.
2. THE Propagation_Modal SHALL display: the name of the modified shift, the number of calendar events that will be affected, a statement that only events in the Current_Year will be updated, and a statement that events in previous years will remain unchanged.
3. WHEN the user confirms propagation in the Propagation_Modal, THE Event_Store SHALL update all non-deleted calendar events that have `eventType` set to "shift" and `eventTypeId` matching the modified shift's ID, and whose `startDay` falls within the Current_Year, by applying the following fields from the updated shift definition: `startTime`, `endTime`, and `totalHours` (from the shift's Hours_Worked); THE Event_Store SHALL set `modifiedAt` to the current UTC timestamp and `syncedAt` to null on each updated event.
4. WHEN the user declines propagation in the Propagation_Modal, THE Shift_Form SHALL save only the shift modification without altering any calendar event records, and SHALL navigate back to the Shifts_Page.
5. IF the modified shift is not referenced by any non-deleted calendar events whose `startDay` falls within the Current_Year, THEN THE Shift_Form SHALL save the shift modification and navigate back to the Shifts_Page without displaying the Propagation_Modal.
6. IF only non-time fields of the shift are modified (e.g., name, color, emoji) without changes to `startTime`, `endTime`, or `totalHours`, THEN THE Shift_Form SHALL save the shift modification and navigate back to the Shifts_Page without displaying the Propagation_Modal.
7. THE propagation SHALL NOT affect calendar events whose `startDay` falls in years prior to the Current_Year, even if those events reference the modified shift.
8. WHEN propagation completes successfully, THE Shift_Form SHALL navigate back to the Shifts_Page, and THE Calendar_Page SHALL reflect the updated event data immediately from the local store without requiring a manual refresh or page reload.
9. IF propagation fails for any event during the update operation, THEN THE system SHALL complete updates for all remaining events, display an error indication to the user stating that some events could not be updated, and leave failed events unchanged in their prior state.
10. THE propagation operation SHALL execute entirely within the local store (offline-capable) without requiring network connectivity; updated events SHALL be marked for synchronization via their `syncedAt` set to null.

### Requirement 7: Propagate Reminder Template Changes to Calendar Events

**User Story:** As a user, I want the system to detect when I modify a reminder that is used in calendar events and ask me whether to update those events, so that my calendar stays consistent with my reminder definitions without manually editing each event.

#### Acceptance Criteria

1. WHEN the user saves modifications to any of the reminder's display fields (name, icon, or backgroundColor) and the modified reminder is referenced by one or more non-deleted calendar events in the Event_Store whose `startDay` falls within the Current_Year, THE Reminder_Form SHALL display a Propagation_Modal asking the user if they want to update all calendar events that reference this reminder for the Current_Year.
2. THE Propagation_Modal SHALL display the following information elements: the name of the modified reminder, a statement that only events in the Current_Year will be affected, and a statement that events in previous years will remain unchanged; THE Propagation_Modal SHALL present exactly two action options: a confirm button to apply propagation and a decline button to skip propagation.
3. WHEN the user confirms propagation in the Propagation_Modal, THE Event_Store SHALL update all non-deleted calendar events that have `eventType` set to "reminder" and `eventTypeId` matching the modified reminder's ID, and whose `startDay` falls within the Current_Year, by setting `modifiedAt` to the current UTC timestamp and `syncedAt` to null on each affected event record; no other event fields are written because the display fields (name, icon, backgroundColor) are derived from the reminder template at read time — the timestamp update ensures other devices pull the refreshed event and re-derive the display values from the updated template.
4. WHEN the user declines propagation in the Propagation_Modal, THE Reminder_Form SHALL save only the reminder modification without altering any calendar event records, and SHALL navigate back to the Reminders_Page.
5. IF the modified reminder is not referenced by any non-deleted calendar events in the Current_Year, THEN THE Reminder_Form SHALL save the reminder modification and navigate back to the Reminders_Page without displaying the Propagation_Modal.
6. IF the user opens an existing reminder for editing and saves the form without changing any of the display fields (name, icon, backgroundColor), THEN THE Reminder_Form SHALL save the record and navigate back to the Reminders_Page without displaying the Propagation_Modal, regardless of whether calendar events reference this reminder.
7. THE propagation SHALL NOT affect calendar events whose `startDay` falls in years prior to the Current_Year, even if those events reference the modified reminder.
8. WHEN propagation completes successfully, THE Reminder_Form SHALL navigate back to the Reminders_Page, and THE Calendar_Page SHALL display the updated reminder name, icon, and backgroundColor on affected events when next viewed (derived from the updated template at read time).
9. IF the Event_Store update fails during propagation (local storage write error), THEN THE Reminder_Form SHALL display an error message indicating the propagation could not be completed, SHALL retain the reminder modification already saved, and SHALL remain on the current screen so the user can retry.
10. THE propagation operation SHALL execute entirely within the local store (offline-capable) without requiring network connectivity; updated events SHALL be marked for synchronization via their `syncedAt` set to null.

### Requirement 8: Cross-Platform Consistency for Improvements

**User Story:** As a user, I want all the shift, reminder, and calendar improvements to behave identically on the React Web and Android platforms, so that I have a consistent experience regardless of device.

#### Acceptance Criteria

1. THE Shift_Form SHALL enforce the same Hours_Worked validation boundaries (minimum 0 minutes, maximum 1440 minutes inclusive) and the same acceptance/rejection logic on both React Web and Android platforms; a value accepted on one platform SHALL NOT be rejected on the other.
2. THE Event_Form SHALL enforce the same reminder-type time validation logic on both React Web and Android platforms: when `endDay` equals `startDay`, `endTime` equal to `startTime` SHALL be accepted without error on both platforms; when `endDay` equals `startDay`, `endTime` less than `startTime` SHALL be rejected on both platforms.
3. THE Propagation_Modal for both shift and reminder modifications SHALL present the same user-facing information (modified template name, Current_Year scope statement, previous-years-unchanged statement) and the same two user options (confirm propagation, decline propagation) on both React Web and Android platforms; platform-native dialog styling differences (Material Design on Android, HTML dialog on Web) are acceptable provided the information content and available actions are equivalent.
4. THE Event_Form day pre-selection from Day View_Mode SHALL assign the currently displayed day as both `startDay` and `endDay` on both React Web and Android platforms, producing the same date values for the same navigation state.
5. WHEN the user changes the language setting to Spanish or English, THE Propagation_Modal SHALL render all its text labels in the selected language the next time it is displayed, without requiring an application restart on either platform.
