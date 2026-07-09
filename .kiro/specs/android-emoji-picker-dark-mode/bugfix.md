# Bugfix Requirements Document

## Introduction

The emoji picker dialog in the Android app uses `androidx.emoji2.emojipicker.EmojiPickerView`, a View-based widget wrapped in Compose via `AndroidView`. In dark mode, the category icons and text within the EmojiPickerView remain dark-colored (designed for light backgrounds), making them nearly invisible against the dark dialog surface. This is because the View-based component inherits the Activity's XML theme (`Theme.AppCompat.Light.NoActionBar`), which has no dark variant, while the surrounding Compose dialog correctly applies the Material3 dark color scheme.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the emoji picker dialog is opened in dark mode THEN the system displays category tab icons in dark/black color against the dark surface background, making them nearly invisible

1.2 WHEN the emoji picker dialog is opened in dark mode THEN the system displays text elements (category labels, search hints) in dark/black color against the dark surface background, resulting in insufficient contrast

1.3 WHEN the emoji picker dialog is opened in dark mode THEN the EmojiPickerView uses the Activity's light XML theme context (`Theme.AppCompat.Light.NoActionBar`) instead of a dark-appropriate theme, causing all View-based internal styling to render as if in light mode

### Expected Behavior (Correct)

2.1 WHEN the emoji picker dialog is opened in dark mode THEN the system SHALL display category tab icons in a light color (aligned with `onSurface` / `#F9FAFB`) that provides sufficient contrast against the dark surface background

2.2 WHEN the emoji picker dialog is opened in dark mode THEN the system SHALL display text elements (category labels, search hints) in a light color that provides sufficient contrast against the dark surface background

2.3 WHEN the emoji picker dialog is opened in dark mode THEN the EmojiPickerView SHALL receive a dark-themed context so that its internal View-based styling renders appropriately for a dark background

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the emoji picker dialog is opened in light mode THEN the system SHALL CONTINUE TO display category icons and text in dark colors with proper contrast against the light surface background

3.2 WHEN the emoji picker dialog is opened in light mode THEN the system SHALL CONTINUE TO display the full emoji grid with proper rendering and selection behavior

3.3 WHEN an emoji is selected in the picker (in either theme mode) THEN the system SHALL CONTINUE TO invoke the `onEmojiSelected` callback with the correct emoji string and close the dialog

3.4 WHEN the emoji picker dialog is dismissed without selection (in either theme mode) THEN the system SHALL CONTINUE TO invoke the `onDismiss` callback without changing the previously selected emoji
