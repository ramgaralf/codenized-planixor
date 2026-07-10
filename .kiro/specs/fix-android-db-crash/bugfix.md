# Bugfix Requirements Document

## Introduction

The Android app crashes on startup with `IllegalStateException` after the gh38-reminder-series update introduced `@ColumnInfo(defaultValue = "[]")` annotation on the `alertOffsets` field of `CalendarEventEntity`. Users who installed the broken update already have their database at version 11, so the no-op migration 10→11 doesn't help — their SQLite schema doesn't match Room's updated compile-time identity hash. The `fallbackToDestructiveMigration()` cannot resolve post-migration schema validation failures, leaving users with no option except wiping all app data (losing everything).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the app starts on a device that was updated during the gh38-reminder-series release AND the database is already at version 11 THEN the system crashes with `IllegalStateException` due to Room schema validation mismatch between the compile-time identity hash (which now includes `defaultValue = "[]"` on `alertOffsets`) and the actual SQLite table schema

1.2 WHEN the user clears the app cache after the crash THEN the system still crashes on the next startup because the database file (with mismatched schema) is not part of the cache

1.3 WHEN `fallbackToDestructiveMigration()` is configured AND the database version matches the expected version (11) but the schema hash differs THEN the system does NOT trigger destructive migration and crashes instead, because `fallbackToDestructiveMigration()` only handles missing migration paths, not post-migration hash validation failures

### Expected Behavior (Correct)

2.1 WHEN the app starts on a device with a database at version 11 that has a schema mismatch on the `calendar_events` table THEN the system SHALL run migration 11→12 which recreates the `calendar_events` table using a temp-table copy pattern, preserving all existing user data, and the app SHALL start successfully

2.2 WHEN migration 11→12 completes THEN the system SHALL have a `calendar_events` table whose schema exactly matches Room's compile-time expectations (including all column defaults and indices declared in `CalendarEventEntity`)

2.3 WHEN a catastrophic database opening failure occurs (e.g., `IllegalStateException` from schema validation on any version) THEN the system SHALL catch the exception, log the error, delete the corrupt database file, and recreate an empty database as a last-resort safety net — the app SHALL NOT crash

2.4 WHEN the database is at version 8, 9, 10, or 11 with potentially corrupt schema THEN the system SHALL use `fallbackToDestructiveMigrationFrom(8, 9, 10, 11)` to enable Room to destroy and recreate the database if no valid migration path exists for those versions

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the app starts on a fresh install (no existing database) THEN the system SHALL CONTINUE TO create the database at the latest version with all tables and indices intact

3.2 WHEN the app starts on a device with a database at version 10 or lower with a valid migration path THEN the system SHALL CONTINUE TO run all migrations sequentially (10→11→12) preserving existing user data in all tables

3.3 WHEN the `reminders` table exists with columns `seriesFrequency` and `seriesEndDate` THEN the system SHALL CONTINUE TO leave the `reminders` table unchanged (no recreation needed since its schema matches Room's expectations)

3.4 WHEN all other tables (`shifts`, `annual_hours_config`, `notification_records`, `shift_mode_settings`) exist with their current schemas THEN the system SHALL CONTINUE TO leave those tables unchanged

3.5 WHEN the database opens successfully via the normal migration path THEN the system SHALL CONTINUE TO NOT trigger the safety-net try/catch (the safety net only activates on `IllegalStateException`)
