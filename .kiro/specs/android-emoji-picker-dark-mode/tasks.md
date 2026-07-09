# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Dark Mode Emoji Picker Theme Context
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: The bug is deterministic — scope to: when dark mode is active and EmojiPickerDialog is composed, the `EmojiPickerView` receives a context whose resolved theme has a dark AppCompat parent
  - Write a unit test in `app/src/test/java/com/codenized/planixor/ui/components/EmojiPickerDialogThemeTest.kt`
  - Test that when dark mode configuration is active, the context passed to `EmojiPickerView` is wrapped in a `ContextThemeWrapper` with `R.style.Theme_Planixor`
  - Verify that `values-night/themes.xml` exists and resolves to a dark AppCompat parent (`Theme.AppCompat.DayNight.NoActionBar`)
  - On UNFIXED code: the factory passes raw Activity context (no `ContextThemeWrapper`), so the test FAILS — confirming the bug
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexample: `EmojiPickerView(context)` receives `Theme.AppCompat.Light.NoActionBar` context in dark mode
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Light Mode and Functional Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Write tests in `app/src/test/java/com/codenized/planixor/ui/components/EmojiPickerDialogPreservationTest.kt`
  - Observe: in light mode, `EmojiPickerDialog` renders with proper contrast (dark icons on light surface) — this must remain unchanged
  - Observe: `onEmojiSelected` callback is invoked with the correct emoji string when an emoji is picked
  - Observe: `onDismiss` callback is invoked when the dialog is dismissed without selection
  - Write property-based tests asserting:
    - For all non-dark-mode states, the EmojiPickerView receives a properly themed context (light variant)
    - The `setOnEmojiPickedListener` callback wiring is preserved regardless of theme mode
    - Dialog structure (Column with title + AndroidView) remains unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix dark mode emoji picker theme

  - [x] 3.1 Create `values-night/themes.xml` resource file
    - Create file at `frontend/android-app/app/src/main/res/values-night/themes.xml`
    - Define `Theme.Planixor` with parent `Theme.AppCompat.DayNight.NoActionBar`
    - Include `<item name="android:windowBackground">@color/splash_background</item>` for consistency
    - This provides the night-qualified resource so `R.style.Theme_Planixor` resolves to a dark parent in dark mode
    - _Bug_Condition: isBugCondition(state) where state.isDarkMode == true AND state.dialogOpen == true AND context.theme == "Theme.AppCompat.Light.NoActionBar"_
    - _Expected_Behavior: EmojiPickerView receives dark-themed context with DayNight parent_
    - _Preservation: Light mode resolves to existing values/themes.xml unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Wrap context with `ContextThemeWrapper` in `EmojiPickerDialog.kt`
    - Edit `frontend/android-app/app/src/main/java/com/codenized/planixor/ui/components/EmojiPickerDialog.kt`
    - Add import for `android.view.ContextThemeWrapper`
    - In the `AndroidView` factory block, wrap the context: `val themedContext = ContextThemeWrapper(context, R.style.Theme_Planixor)`
    - Pass `themedContext` to `EmojiPickerView(themedContext)` instead of `EmojiPickerView(context)`
    - This ensures `EmojiPickerView` resolves its internal styling from the app's theme (which now has a night variant)
    - _Bug_Condition: EmojiPickerView(context) uses raw Activity context with light-only theme_
    - _Expected_Behavior: EmojiPickerView(ContextThemeWrapper(context, R.style.Theme_Planixor)) uses theme-qualified context_
    - _Preservation: In light mode, R.style.Theme_Planixor still resolves to the light parent — no visual change_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dark Mode Emoji Picker Theme Context
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (ContextThemeWrapper with Theme.Planixor)
    - When this test passes, it confirms the EmojiPickerView now receives a properly themed context in dark mode
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Light Mode and Functional Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions in light mode appearance or emoji selection behavior)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `./gradlew testDebug` from `frontend/android-app/` to confirm all unit tests pass
  - Run `./gradlew assembleDebug` to confirm build succeeds
  - Run `./gradlew lintDebug` to confirm no lint errors introduced
  - Ensure all tests pass, ask the user if questions arise.
