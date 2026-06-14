# Requirements Document

## Introduction

This document defines the requirements for the Calendar Dashboard — the main page of the Planixor platform. The Calendar Dashboard serves as the default landing screen for both the React Web PWA and the Android native app. It includes navigation structure, calendar views with time-range controls, an analytics side panel, and a three-state theme system (Light, Dark, System). Both clients must achieve feature and design parity while adapting layout to their respective platforms.

## Glossary

- **Dashboard**: The main screen of the application that displays the calendar, navigation, and analytics panels
- **Calendar_View**: One of four temporal perspectives for displaying calendar data — Day, Week, Month, or Year
- **Navigation_Sidebar**: The fixed left-side vertical menu in the React Web PWA containing navigation items
- **Bottom_Navigation_Bar**: The fixed bottom horizontal menu in the Android app containing navigation items
- **Right_Panel**: The collapsible right-side panel in the React Web PWA displaying weekly summary and analytics
- **View_Selector**: The UI control that allows the user to switch between Day, Week, Month, and Year views
- **Navigation_Buttons**: The previous/next arrow controls that move the displayed time range forward or backward
- **Theme_Manager**: The subsystem responsible for detecting, persisting, and applying the active visual theme
- **FAB**: Floating Action Button — a circular button used on Android and responsive web for quick event creation
- **Analytics_Charts**: The set of visual data representations (bar chart, donut chart) displayed in the Right_Panel or Reports screen
- **i18n_Service**: The internationalization service that provides all user-facing strings in Spanish or English
- **Local_Store**: The client-side persistent data store (IndexedDB for Web, SQLite for Android)

## Requirements

### Requirement 1: Default Screen Navigation

**User Story:** As a user, I want the Calendar to load as the default screen when I open the app, so that I can immediately see my schedule without extra navigation steps.

#### Acceptance Criteria

1. WHEN the application is launched via cold start or the user navigates to the root URL, THE Dashboard SHALL display the Calendar_View as the initial active screen
2. THE Navigation_Sidebar SHALL NOT include a "Home" menu item
3. THE Bottom_Navigation_Bar SHALL NOT include a "Home" menu item
4. WHEN the application is launched via cold start, THE Navigation_Sidebar SHALL display the Calendar item highlighted with `primary-blue` (#2563EB) indicating the active state
5. WHEN the application is launched via cold start, THE Bottom_Navigation_Bar SHALL display the Calendar item highlighted with `primary-blue` (#2563EB) indicating the active state
6. WHEN the Dashboard loads for the first time after launch, THE Dashboard SHALL render the Calendar_View within 1 second of the application becoming interactive, using data from the Local_Store

### Requirement 2: Web Navigation Sidebar

**User Story:** As a web user, I want a sidebar with organized navigation items, so that I can access all sections of the application from any screen.

#### Acceptance Criteria

1. THE Navigation_Sidebar SHALL display the following menu items in order: Calendar, Shifts, Reminders, Reports, Settings
2. IF the user is authenticated, THEN THE Navigation_Sidebar SHALL display the user profile section at the bottom-left position containing avatar, display name, and role. IF the user is anonymous (no account), THEN THE Navigation_Sidebar SHALL display a generic placeholder avatar and a "Sign in" action label in place of the display name and role
3. WHEN a menu item is selected, THE Navigation_Sidebar SHALL navigate to the corresponding application section and apply the `primary-blue` (#2563EB) color to the active item
4. WHILE the viewport width is at least 1024px, THE Navigation_Sidebar SHALL render in expanded mode with a width of 240px showing icons and labels
5. WHILE the viewport width is between 768px and 1023px, THE Navigation_Sidebar SHALL render in collapsed mode with a width of 64px showing icons only
6. WHILE the viewport width is less than 768px, THE Navigation_Sidebar SHALL be hidden and THE Bottom_Navigation_Bar SHALL be displayed instead
7. THE Navigation_Sidebar SHALL support keyboard navigation such that all menu items are reachable via the Tab key, activatable via Enter or Space key, and display a visible focus indicator meeting WCAG 2.1 AA contrast requirements

### Requirement 3: Android Bottom Navigation

**User Story:** As an Android user, I want a bottom navigation bar, so that I can quickly switch between main sections using thumb-friendly controls.

#### Acceptance Criteria

1. THE Bottom_Navigation_Bar SHALL display the following items in order, each with an icon and a text label: Calendar, Shifts, Reminders, Reports, Settings
2. WHEN a navigation item is tapped, THE Bottom_Navigation_Bar SHALL apply `primary-blue` (#2563EB) to the selected item's icon and label, and apply `text-secondary` (#6B7280) to all unselected items' icons and labels
3. WHEN a navigation item is tapped, THE Dashboard SHALL navigate to the corresponding screen while the Bottom_Navigation_Bar remains fixed and visible at the bottom of the viewport
4. THE Bottom_Navigation_Bar SHALL provide a minimum touch target of 48dp height for each navigation item

### Requirement 4: Calendar View Selector

**User Story:** As a user, I want to switch between Day, Week, Month, and Year views, so that I can see my schedule at different levels of detail.

#### Acceptance Criteria

1. THE View_Selector SHALL provide four options: Day, Week, Month, Year
2. WHEN the application launches for the first time, THE View_Selector SHALL default to the Day view. On subsequent launches, THE View_Selector SHALL restore the last used view from local persistence
3. WHEN the user selects a view option, THE Dashboard SHALL update the calendar display to the selected Calendar_View within 300ms
4. WHEN the user switches from one Calendar_View to another, THE Dashboard SHALL preserve the currently viewed date context such that the newly selected view includes the same focal date (e.g., switching from Day showing March 12 to Week shows the week containing March 12)
5. THE View_Selector SHALL visually indicate the currently active view using `primary-blue` (#2563EB)
6. WHILE the React Web PWA is displayed, THE View_Selector SHALL render as horizontal top tabs above the calendar area
7. WHILE the Android app is displayed, THE View_Selector SHALL render as a compact top dropdown menu or segmented tabs

### Requirement 5: Time-Range Navigation Buttons

**User Story:** As a user, I want previous/next navigation buttons, so that I can move through time periods relative to the active calendar view.

#### Acceptance Criteria

1. WHILE the Calendar_View is set to Day, THE Navigation_Buttons SHALL move the display one day forward or backward per press
2. WHILE the Calendar_View is set to Week, THE Navigation_Buttons SHALL move the display one week forward or backward per press
3. WHILE the Calendar_View is set to Month, THE Navigation_Buttons SHALL move the display one month forward or backward per press
4. WHILE the Calendar_View is set to Year, THE Navigation_Buttons SHALL move the display one year forward or backward per press
5. WHEN a Navigation_Button is pressed, THE Dashboard SHALL update the displayed date range label using the following format per view: Day view displays the full date including weekday, day, month, and year; Week view displays the week number and year; Month view displays the month name and year; Year view displays the year
6. THE Dashboard SHALL display a "Today" button that is visible and enabled in all calendar views
7. WHEN the Today button is pressed, THE Dashboard SHALL navigate the calendar to the period containing the current date in the active view
8. IF the Today button is pressed while the displayed period already contains the current date, THEN THE Dashboard SHALL remain on the current period without triggering a navigation or visual transition

### Requirement 6: Right Analytics Panel (Web)

**User Story:** As a web user, I want a side panel with summaries and quick reports that adapt to the active calendar view, so that I can view relevant analytics for the selected time range without leaving the calendar.

#### Acceptance Criteria

1. WHEN the Calendar_View selection changes, THE Right_Panel SHALL update its data to reflect the active time range (Day, Week, Month, or Year) within 500 milliseconds
2. WHILE the Calendar_View is set to Day, THE Right_Panel SHALL display a summary showing the total hours worked as a numeric value and the count of shifts for the selected day
3. WHILE the Calendar_View is set to Week, THE Right_Panel SHALL display a summary showing the total hours worked as a numeric value and the count of completed shifts for the selected week
4. WHILE the Calendar_View is set to Month, THE Right_Panel SHALL display a summary showing the total hours worked as a numeric value and the count of completed shifts for the selected month
5. WHILE the Calendar_View is set to Year, THE Right_Panel SHALL display a summary showing the total hours worked as a numeric value and the count of completed shifts for the selected year
6. THE Right_Panel SHALL display a bar chart representing hours worked per subdivision of the active time range, where subdivisions are: hours for Day view, days of the week for Week view, weeks for Month view, and months for Year view
7. THE Right_Panel SHALL display a donut chart representing total hours distributed by shift type (Morning, Afternoon, Night) for the active time range
8. THE Right_Panel SHALL display an upcoming events list showing a maximum of 5 next scheduled events and shifts within the active time range, ordered by start time ascending
9. WHILE the viewport width is less than 1024px, THE Right_Panel SHALL be hidden
10. THE Analytics_Charts SHALL render data dynamically from the Local_Store
11. THE Analytics_Charts SHALL use colors exclusively from the brand palette: `primary-blue` (#2563EB), `primary-purple` (#7C3AED), `accent-teal` (#0B86D4), `accent-green` (#10B981)
12. IF the Local_Store contains no event or shift data for the active time range, THEN THE Right_Panel SHALL display the summary values as zero and the charts as empty states with a message indicating no data is available

### Requirement 7: Android Reports Screen

**User Story:** As an Android user, I want a dedicated reports screen accessible from the bottom navigation, so that I can review analytics in a mobile-optimized layout since the main screen is reserved for the calendar.

#### Acceptance Criteria

1. WHEN the user navigates to the Reports screen, THE Reports screen SHALL display analytics in a single-column vertical layout with the following components in order from top to bottom: time-range selector, bar chart, donut chart, and upcoming events and shifts list
2. THE Reports screen SHALL provide a time-range selector with the options Day, Week, Month, and Year, with Week selected by default on initial navigation
3. WHEN the time-range selection changes, THE Reports screen SHALL update all charts and summaries to reflect the selected period
4. THE Reports screen SHALL display a bar chart for hours worked where the bars represent: hours of the day for Day view, days of the week (Mon–Sun) for Week view, days of the month for Month view, and months of the year (Jan–Dec) for Year view
5. THE Reports screen SHALL display a donut chart for hour distribution by shift type (Morning, Afternoon, Night) within the selected time range, with the total hours displayed in the center of the donut
6. THE Reports screen SHALL display an events and shifts list showing up to 20 items that fall within the selected time range, sorted chronologically
7. THE Reports screen SHALL render chart and list data by reading from the Local_Store, updating the displayed content when the underlying local data changes
8. IF no data exists for the selected time range, THEN THE Reports screen SHALL display an empty state message indicating that no records are available for the selected period
9. IF the Local_Store read fails, THEN THE Reports screen SHALL display an error indication and retain the previously displayed data if available

### Requirement 8: Theme Management — Three-State System

**User Story:** As a user, I want to choose between Light, Dark, or System-default theme, so that the app matches my visual preference or follows my device settings automatically.

#### Acceptance Criteria

1. THE Theme_Manager SHALL support exactly three mutually exclusive states: Light Mode, Dark Mode, and System Default
2. WHEN the application launches for the first time, THE Theme_Manager SHALL initialize with System Default as the active theme
3. WHILE System Default is active, THE Theme_Manager SHALL detect and apply operating system theme changes in real time without requiring an app restart or manual refresh
4. WHEN the user selects Light Mode, THE Theme_Manager SHALL apply the light color scheme without requiring an app restart, persist the selection to local storage (LocalStorage on Web, DataStore on Android), and ignore subsequent operating system theme changes until the user selects a different mode
5. WHEN the user selects Dark Mode, THE Theme_Manager SHALL apply the dark color scheme without requiring an app restart, persist the selection to local storage (LocalStorage on Web, DataStore on Android), and ignore subsequent operating system theme changes until the user selects a different mode
6. WHEN the user selects System Default, THE Theme_Manager SHALL resume following the operating system preference, apply the current OS theme without requiring an app restart, and persist the selection to local storage (LocalStorage on Web, DataStore on Android)
7. WHEN the application launches after the first use, THE Theme_Manager SHALL read the persisted theme selection from local storage and apply it as the active theme before rendering the UI
8. IF the persisted theme selection is missing or unreadable on launch, THEN THE Theme_Manager SHALL fall back to System Default as the active theme
9. WHILE Light Mode is active, THE Dashboard SHALL use `#FFFFFF` as general background, `#F3F4F6` as card background, and `#111827` as primary text color
10. WHILE Dark Mode is active, THE Dashboard SHALL use `#0F172A` as general background, `#1E293B` as card background, and `#F9FAFB` as primary text color

### Requirement 9: Theme Persistence

**User Story:** As a user, I want my theme preference saved locally, so that the app remembers my choice when I reopen it.

#### Acceptance Criteria

1. WHEN the user changes the theme preference on the React Web PWA, THE Theme_Manager SHALL persist the selected value ("light", "dark", or "system") to LocalStorage within 100ms of the selection
2. WHEN the user changes the theme preference on the Android app, THE Theme_Manager SHALL persist the selected value ("light", "dark", or "system") to DataStore within 100ms of the selection
3. WHEN the application launches, THE Theme_Manager SHALL read the persisted theme preference and apply it before any themed UI content becomes visible to the user, ensuring no flash of incorrect theme occurs
4. IF the persisted theme preference is missing or contains a value other than "light", "dark", or "system", THEN THE Theme_Manager SHALL fall back to "system" as the active theme and overwrite the invalid entry with "system"
5. THE Theme_Manager SHALL persist and retrieve the theme preference using only local storage mechanisms, requiring no network connectivity

### Requirement 10: System Theme Detection

**User Story:** As a user with System Default selected, I want the app to react to OS-level theme changes in real time, so that the app stays visually consistent with my device.

#### Acceptance Criteria

1. WHILE System Default is active on the React Web PWA, WHEN the operating system theme preference changes, THE Theme_Manager SHALL apply the corresponding light or dark theme to all visible UI elements (backgrounds, text colors, card surfaces, sidebar, and borders) within 200ms of the OS change, without requiring a page reload or navigation action
2. WHILE System Default is active on the React Web PWA, THE Theme_Manager SHALL continuously monitor the operating system theme preference so that any change is detected while the app is in the foreground
3. WHILE System Default is active on the Android app, WHEN the operating system theme preference changes, THE Theme_Manager SHALL apply the corresponding light or dark theme to all visible UI elements (backgrounds, text colors, card surfaces, and navigation bar) within 200ms of the OS change, without requiring an app restart or activity recreation by the user

### Requirement 11: Brand Color Compliance

**User Story:** As a product owner, I want all UI elements to use the exact brand colors, so that the visual identity remains consistent across platforms.

#### Acceptance Criteria

1. THE Dashboard SHALL render primary interactive elements (buttons, links, active navigation indicators) using `primary-blue` (#2563EB)
2. THE Dashboard SHALL render accent and gradient elements using `primary-purple` (#7C3AED)
3. THE Dashboard SHALL render secondary indicators and badges using `accent-teal` (#0B86D4)
4. THE Dashboard SHALL render success states and positive chart values using `accent-green` (#10B981)
5. THE Dashboard SHALL use Poppins as the sole font family across all text elements
6. THE FAB SHALL display a gradient from `primary-blue` (#2563EB) to `primary-purple` (#7C3AED)
7. WHILE light mode is active, THE Dashboard SHALL render backgrounds using `#FFFFFF` (general) and `neutral-light` (#F3F4F6) (cards/panels), and text using `text-primary-light` (#111827) for primary text and `text-secondary` (#6B7280) for secondary text
8. WHILE dark mode is active, THE Dashboard SHALL render backgrounds using `background-dark` (#0F172A) (general) and `surface-dark` (#1E293B) (cards/panels), and text using `text-primary-dark` (#F9FAFB) for primary text and `text-secondary` (#6B7280) for secondary text
9. THE Dashboard SHALL render identical brand color token values on both the React Web PWA and the Android native app, with no platform-specific overrides to the hex values defined in the design token palette

### Requirement 12: Typography Compliance

**User Story:** As a product owner, I want consistent typography using the Poppins font family, so that the interface looks professional and readable.

#### Acceptance Criteria

1. THE Dashboard SHALL render headings (h1–h3) in Poppins Bold (700 weight)
2. THE Dashboard SHALL render subheadings (h4–h6) in Poppins SemiBold (600 weight)
3. THE Dashboard SHALL render body text in Poppins Regular (400 weight)
4. THE Dashboard SHALL render labels and captions in Poppins Medium (500 weight)
5. THE Dashboard SHALL render numeric data in Poppins SemiBold (600 weight), where numeric data is defined as: chart axis values, chart data labels, metric counters in summary widgets, percentage indicators, and hour totals displayed in reports
6. IF the Poppins font fails to load or is unavailable, THEN THE Dashboard SHALL fall back to the system sans-serif font stack (system-ui, -apple-system, sans-serif for Web; the platform default sans-serif for Android) while preserving the specified weight mappings
7. THE React Web PWA SHALL load Poppins via the self-hosted @fontsource/poppins package bundled with the application, and THE Android app SHALL bundle Poppins font files in the app resources for use via Compose Typography

### Requirement 13: Floating Action Button

**User Story:** As a user, I want a prominent button to quickly add new events, so that creating events is fast and accessible from the main screen.

#### Acceptance Criteria

1. THE Dashboard SHALL display a circular FAB positioned at the bottom-right corner of the screen on the Android app, showing a "+" icon for creating new events
2. WHILE the viewport width is less than 768px, THE Dashboard SHALL display a circular FAB positioned at the bottom-right corner of the screen on the React Web PWA, showing a "+" icon for creating new events
3. IF the React Web PWA viewport width is 768px or greater, THEN THE Dashboard SHALL NOT display the FAB
4. WHEN the user taps the FAB, THE Dashboard SHALL open the event creation flow
5. THE FAB SHALL use the `primary-blue` to `primary-purple` gradient background with a white "+" icon
6. THE FAB SHALL have a minimum touch target size of 48x48dp (Android) or 44x44px (Web) and include an accessible label indicating its purpose

### Requirement 14: Internationalization

**User Story:** As a user, I want the interface to support Spanish and English, so that I can use the app in my preferred language.

#### Acceptance Criteria

1. THE i18n_Service SHALL externalize all user-facing strings displayed on the Dashboard into locale resource files, providing a complete translation for both Spanish (es) and English (en) locales
2. THE Dashboard SHALL NOT contain hardcoded user-facing strings in source code; every user-visible text element SHALL reference a key from the locale resource files
3. WHEN the user changes the language preference, THE Dashboard SHALL re-render all text content in the selected locale without requiring an app restart
4. WHEN the application launches and no language preference has been previously stored, THE i18n_Service SHALL set the active locale to the device or browser locale if it matches a supported locale (es or en), or default to Spanish (es) if the detected locale is unsupported
5. WHEN the user selects a language preference, THE i18n_Service SHALL persist the selection locally (LocalStorage or IndexedDB for Web, DataStore for Android) so that subsequent app launches use the stored preference
6. WHILE a locale is active, THE Dashboard SHALL format all date and time values according to the conventions of the active locale (e.g., date order, month names, day names, time format)

### Requirement 15: Offline-First Data Loading

**User Story:** As a user, I want the calendar and analytics to load from local data, so that the app works without an internet connection.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL retrieve and render calendar events and shift data exclusively from the Local_Store without initiating any network requests
2. WHEN the Dashboard loads, THE Analytics_Charts SHALL compute and render chart data exclusively from the Local_Store without initiating any network requests
3. IF the Local_Store contains no calendar events or shifts, THEN THE Dashboard SHALL display an empty state placeholder indicating that no data has been created yet, rather than an error or loading indicator
4. WHILE the device has no internet connectivity, THE Dashboard SHALL display all locally stored calendar events, shifts, and analytics charts without errors, loading spinners, or empty states caused by network unavailability
5. THE Dashboard SHALL NOT make any network requests as a prerequisite for rendering calendar events, shift data, or analytics charts

### Requirement 16: Responsive Layout (Web)

**User Story:** As a web user, I want the layout to adapt to my screen size, so that the experience is optimal whether I'm on desktop, tablet, or mobile.

#### Acceptance Criteria

1. WHILE the viewport width is at least 1024px, THE Dashboard SHALL display the expanded Navigation_Sidebar (240px wide), the main calendar area filling remaining horizontal space, and the Right_Panel in a three-column layout
2. WHILE the viewport width is between 768px and 1023px, THE Dashboard SHALL display the collapsed Navigation_Sidebar (64px wide, icons only) and the main calendar area filling remaining horizontal space in a two-column layout, with the Right_Panel hidden
3. WHILE the viewport width is less than 768px, THE Dashboard SHALL hide the Navigation_Sidebar, hide the Right_Panel, display the Bottom_Navigation_Bar, display a FAB for quick event creation, and stack content in a single-column vertical layout
4. WHEN the viewport width crosses a breakpoint boundary (768px or 1024px), THE Dashboard SHALL transition to the corresponding layout without requiring a page reload

### Requirement 17: Calendar Data Display

**User Story:** As a user, I want to see my events and shifts rendered on the calendar, so that I can visualize my schedule at a glance.

#### Acceptance Criteria

1. WHEN the Calendar_View renders, THE Dashboard SHALL display all events and shifts from the Local_Store positioned at their scheduled date and time within the currently visible period
2. THE Dashboard SHALL apply a left-side color indicator to each event card: light blue/cyan for morning shifts, violet/purple for afternoon shifts, dark indigo for night shifts, green for personal events
3. WHILE the Calendar_View is set to Day view on Android, THE Dashboard SHALL display a vertical timeline layout with time slots at 1-hour intervals covering the full 24-hour period
4. THE Dashboard SHALL use linear, fine-stroke icons from a single consistent icon set (Lucide or equivalent)
5. IF multiple events or shifts are scheduled at the same time slot, THEN THE Dashboard SHALL render them stacked vertically within that slot without overlapping adjacent time slots
6. THE Dashboard SHALL render each event card with rounded corners (8–12px border-radius), a soft drop shadow in light mode, and a subtle border (no shadow) in dark mode
7. IF no events or shifts exist for the currently displayed period, THEN THE Dashboard SHALL display an empty-state message indicating no scheduled items for that period
