# Android Emoji Picker Dark Mode Bugfix Design

## Overview

The `EmojiPickerView` (from `androidx.emoji2:emojipicker`) renders its category icons and text in dark colors regardless of the app's theme mode. In dark mode, these elements become nearly invisible against the dark dialog surface. The root cause is that the View-based widget inherits the Activity's XML theme (`Theme.AppCompat.Light.NoActionBar`) which has no night variant. The fix wraps the context passed to `EmojiPickerView` in a `ContextThemeWrapper` using the app's own `Theme.Planixor` style, after creating a `values-night/themes.xml` with a dark AppCompat parent. This ensures the picker automatically receives the correct styling based on the system/app theme mode.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the emoji picker dialog is opened while the app is in dark mode
- **Property (P)**: The desired behavior — category icons and text render in light colors with sufficient contrast against the dark surface
- **Preservation**: Light mode behavior and emoji selection functionality must remain unchanged
- **EmojiPickerView**: The `androidx.emoji2.emojipicker.EmojiPickerView` widget that displays emojis with category tabs
- **ContextThemeWrapper**: An Android class that wraps a `Context` with a specific theme overlay, allowing View-based widgets to receive different styling than their parent Activity
- **EmojiPickerDialog**: The Compose dialog in `ui/components/EmojiPickerDialog.kt` that wraps `EmojiPickerView` via `AndroidView`

## Bug Details

### Bug Condition

The bug manifests when the emoji picker dialog is opened while the app is in dark mode. The `EmojiPickerView` factory inside `AndroidView` receives the Activity context, which carries `Theme.AppCompat.Light.NoActionBar`. Since there is no `values-night/themes.xml`, the View-based widget always renders with light-theme styling (dark icons, dark text) regardless of the Compose theme state.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AppState { isDarkMode: boolean, dialogOpen: boolean }
  OUTPUT: boolean

  RETURN input.isDarkMode == true
         AND input.dialogOpen == true
         AND emojiPickerViewContext.theme == "Theme.AppCompat.Light.NoActionBar"
END FUNCTION
```

### Examples

- User in dark mode opens emoji picker from Shift form → category icons (Smileys, Animals, Food, etc.) are black/dark on dark surface, nearly invisible
- User in dark mode opens emoji picker from Reminder form → search hint text is dark gray on dark surface, unreadable
- User in light mode opens emoji picker → all icons and text display correctly with proper contrast (not affected)
- User switches from light to dark mode, then opens emoji picker → icons still render dark (bug triggers)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Light mode emoji picker appearance must remain unchanged — dark icons/text on light surface
- Emoji selection callback (`onEmojiSelected`) must continue to invoke with the correct emoji string
- Dialog dismiss behavior must continue to work (tap outside, back gesture)
- Category navigation (tab switching) must continue to function in both modes
- Recent emojis section must continue to display correctly
- Emoji grid rendering and scrolling must remain unchanged

**Scope:**
All inputs that do NOT involve dark mode theming should be completely unaffected by this fix. This includes:
- Light mode emoji picker rendering
- Emoji selection events
- Dialog lifecycle (open/close/dismiss)
- Category tab navigation
- Search functionality within the picker

## Hypothesized Root Cause

Based on the bug analysis, the root cause is confirmed:

1. **Missing night theme resource**: The app has only `values/themes.xml` with `Theme.AppCompat.Light.NoActionBar` as parent. There is no `values-night/themes.xml` file. The Android resource system has no dark variant to provide.

2. **View inherits Activity context**: The `AndroidView` factory receives the Activity's context (which carries the light XML theme). Since Compose's Material3 dark theme doesn't affect View-based widgets, the `EmojiPickerView` always renders with light-theme internal styling.

3. **No context wrapping**: The current `EmojiPickerView(context)` call passes the raw Activity context without any theme override. The `EmojiPickerView` uses this context to resolve its internal text colors, icon tints, and background colors — all of which are designed for a light background.

## Correctness Properties

Property 1: Bug Condition - Dark Mode Category Icons and Text Visibility

_For any_ state where the app is in dark mode and the emoji picker dialog is opened, the fixed `EmojiPickerDialog` SHALL provide a dark-themed context to `EmojiPickerView` so that its category icons and text render in light colors (aligned with `onSurface` tones) with sufficient contrast against the dark surface background.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Light Mode and Functional Behavior

_For any_ state where the app is in light mode, or where the interaction does not involve theme-dependent rendering (emoji selection, dialog dismiss, category navigation), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing light mode appearance and emoji picker functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File 1**: `frontend/android-app/app/src/main/res/values-night/themes.xml` (NEW)

Create a night-qualified theme resource with a dark AppCompat parent:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.Planixor" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@color/splash_background</item>
    </style>
</resources>
```

This ensures that when `Theme.Planixor` is resolved at runtime in dark mode, it inherits dark AppCompat attributes (light text colors, appropriate icon tints).

**File 2**: `frontend/android-app/app/src/main/java/com/codenized/planixor/ui/components/EmojiPickerDialog.kt`

**Specific Changes**:

1. **Import `isSystemInDarkTheme`**: Add Compose utility to detect current dark mode state
2. **Import `ContextThemeWrapper`**: Android class for wrapping context with a theme
3. **Import `R`**: Already present — for referencing `R.style.Theme_Planixor`
4. **Wrap context in factory**: Inside the `AndroidView` factory, create a `ContextThemeWrapper` using the app's `Theme.Planixor` style. Since the night-qualified resource now exists, resolving `R.style.Theme_Planixor` in dark mode will automatically pick up the dark parent theme.
5. **Pass dark mode flag to update block**: Use `isSystemInDarkTheme()` outside the factory to force recomposition when theme changes. The `update` block ensures the view is recreated with the correct theme when the user switches modes mid-session.

**Implementation approach**: Rather than detecting dark mode ourselves and conditionally applying a theme, we create `values-night/themes.xml` so that `R.style.Theme_Planixor` automatically resolves to the correct light/dark variant. The `ContextThemeWrapper` in the factory applies whichever variant is active.

## Testing Strategy

### Validation Approach

The testing strategy focuses on visual verification since the `EmojiPickerView` is a third-party View-based widget whose internal rendering cannot be easily asserted programmatically. The fix is primarily a configuration/theming change rather than a logic change.

### Exploratory Bug Condition Checking

**Goal**: Confirm the bug exists on unfixed code by opening the emoji picker in dark mode and observing that category icons and text are invisible/low-contrast.

**Test Plan**: Manual verification steps on unfixed code:
1. Set device/emulator to dark mode
2. Navigate to Shift or Reminder creation form
3. Tap the emoji picker button
4. Observe that category tabs and text are dark-on-dark (bug confirmed)

**Expected Counterexamples**:
- Category icons rendered in black/dark gray against `#1A2035` surface
- Search hint text rendered in dark color, unreadable against dark background

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (dark mode + dialog open), the fixed dialog renders the emoji picker with proper contrast.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition(state) DO
  result := openEmojiPickerDialog_fixed(state)
  ASSERT emojiPickerView.context.theme.parent == "Theme.AppCompat.DayNight.NoActionBar"
  ASSERT categoryIconsHaveSufficientContrast(result)
  ASSERT textElementsHaveSufficientContrast(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (light mode, or any non-theme interaction), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition(state) DO
  ASSERT openEmojiPickerDialog_original(state) = openEmojiPickerDialog_fixed(state)
END FOR
```

**Testing Approach**: Since this is a visual/theming fix on a third-party widget, property-based testing is less applicable than for logic bugs. The primary validation is:
1. Instrumented UI tests confirming the picker opens and functions in both modes
2. Manual visual verification of contrast

**Test Cases**:
1. **Light Mode Preservation**: Open emoji picker in light mode → icons and text remain dark, readable
2. **Emoji Selection Preservation**: Select emoji in both modes → callback fires with correct emoji string
3. **Dialog Dismiss Preservation**: Dismiss dialog in both modes → onDismiss callback fires
4. **Theme Switch**: Switch theme while picker is NOT open → next open uses correct theme

### Unit Tests

- Verify that `ContextThemeWrapper` is applied with `R.style.Theme_Planixor` in the factory
- Verify that the `values-night/themes.xml` resource resolves correctly

### Property-Based Tests

- Not strongly applicable for this visual/theming bug. The fix involves resource qualification and context wrapping, which are better validated through integration/instrumented tests.

### Integration Tests

- Open emoji picker in dark mode → verify picker view is created with themed context
- Open emoji picker in light mode → verify existing appearance unchanged
- Select emoji in dark mode → verify callback works correctly
- Open picker, switch theme externally, open picker again → verify correct theme applied
