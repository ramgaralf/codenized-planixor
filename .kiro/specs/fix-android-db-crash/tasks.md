# Implementation Plan

- [x] 1. Create MIGRATION_11_12 that recreates calendar_events table preserving data
  - **Property 1: Bug Condition** - Room Schema Validation Mismatch on calendar_events
  - **CRITICAL**: This migration fixes the schema mismatch that causes IllegalStateException on startup
  - **GOAL**: Recreate the calendar_events table with the exact schema Room expects from the entity annotations

  - [x] 1.1 Add MIGRATION_11_12 to PlanixorDatabase companion object
    - Create a new `Migration(11, 12)` that uses the temp-table copy pattern
    - Create temp table `calendar_events_temp` with EXACT schema Room expects:
      ```sql
      CREATE TABLE IF NOT EXISTS `calendar_events_temp` (
          `id` TEXT NOT NULL,
          `eventType` TEXT NOT NULL,
          `eventTypeId` TEXT NOT NULL,
          `startDay` TEXT NOT NULL,
          `endDay` TEXT NOT NULL,
          `startTime` INTEGER NOT NULL,
          `endTime` INTEGER NOT NULL,
          `totalHours` INTEGER NOT NULL,
          `notes` TEXT,
          `modifiedAt` INTEGER NOT NULL,
          `syncedAt` INTEGER,
          `isDeleted` INTEGER NOT NULL,
          `alertOffsets` TEXT NOT NULL DEFAULT '[]',
          `seriesId` TEXT NOT NULL DEFAULT '',
          PRIMARY KEY(`id`)
      )
      ```
    - IMPORTANT: `isDeleted` has NO DEFAULT (no `@ColumnInfo(defaultValue)` annotation on entity)
    - IMPORTANT: `alertOffsets` HAS `DEFAULT '[]'` (has `@ColumnInfo(defaultValue = "[]")`)
    - IMPORTANT: `seriesId` HAS `DEFAULT ''` (has `@ColumnInfo(defaultValue = "")`)
    - Copy data: `INSERT INTO calendar_events_temp SELECT id, eventType, eventTypeId, startDay, endDay, startTime, endTime, totalHours, notes, modifiedAt, syncedAt, isDeleted, alertOffsets, seriesId FROM calendar_events`
    - Drop old: `DROP TABLE calendar_events`
    - Rename: `ALTER TABLE calendar_events_temp RENAME TO calendar_events`
    - Recreate all 5 indices matching entity `@Entity(indices = [...])`:
      - `index_calendar_events_startDay_eventType_isDeleted` ON (`startDay`, `eventType`, `isDeleted`)
      - `index_calendar_events_startDay` ON (`startDay`)
      - `index_calendar_events_endDay` ON (`endDay`)
      - `index_calendar_events_isDeleted` ON (`isDeleted`)
      - `index_calendar_events_eventType` ON (`eventType`)
    - _Bug_Condition: isBugCondition(device) where device.dbVersion = 11 AND room_identity_hash != expected_hash_
    - _Expected_Behavior: After migration 11→12, calendar_events schema matches Room's compile-time expectations_
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 Update @Database version from 11 to 12
    - In `PlanixorDatabase.kt`, change `version = 11` to `version = 12` in the `@Database` annotation
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Register MIGRATION_11_12 in DatabaseModule.kt addMigrations chain
    - Add `PlanixorDatabase.MIGRATION_11_12` to the `.addMigrations(...)` call in `providePlanixorDatabase`
    - _Requirements: 2.1, 2.2, 3.2_

- [x] 2. Add safety net for catastrophic DB failures
  - **Property 2: Preservation** - Non-Crash Behavior for All DB States
  - **GOAL**: Ensure the app never crashes on startup regardless of DB state

  - [x] 2.1 Replace deprecated fallbackToDestructiveMigration() with fallbackToDestructiveMigrationFrom(8, 9, 10, 11)
    - In `DatabaseModule.kt`, replace `.fallbackToDestructiveMigration()` with `.fallbackToDestructiveMigrationFrom(8, 9, 10, 11)`
    - This enables Room to destroy and recreate the DB if no valid migration path exists for versions 8-11
    - _Requirements: 2.4_

  - [x] 2.2 Add try/catch wrapper that catches IllegalStateException, deletes DB file, and recreates
    - Room's `.build()` is lazy — the actual DB open (migration/validation) happens on first DAO access
    - Force-open the DB immediately after build using `db.openHelper.writableDatabase`
    - Wrap in try/catch for `IllegalStateException`
    - On catch: log error, close DB, delete database file via `context.deleteDatabase("planixor_database")`, rebuild
    - Implementation pattern:
      ```kotlin
      fun providePlanixorDatabase(@ApplicationContext context: Context): PlanixorDatabase {
          val db = buildDatabase(context)
          try {
              db.openHelper.writableDatabase
          } catch (e: IllegalStateException) {
              Log.e("DatabaseModule", "DB schema validation failed, recreating database", e)
              db.close()
              context.deleteDatabase("planixor_database")
              return buildDatabase(context)
          }
          return db
      }

      private fun buildDatabase(context: Context): PlanixorDatabase {
          return Room.databaseBuilder(context, PlanixorDatabase::class.java, "planixor_database")
              .addMigrations(...)
              .fallbackToDestructiveMigrationFrom(8, 9, 10, 11)
              .build()
      }
      ```
    - _Preservation: Safety net only activates on IllegalStateException; normal startup path is unchanged_
    - _Requirements: 2.3, 3.5_

- [x] 3. Bump app version for release
  - [x] 3.1 Update versionCode from 8 to 9 and versionName from "1.2.3" to "1.2.4"
    - In `frontend/android-app/app/build.gradle.kts`, update `versionCode = 9` and `versionName = "1.2.4"`

- [x] 4. Build verification
  - [x] 4.1 Run assembleDebug and verify compilation succeeds
    - Run `./gradlew assembleDebug` from `frontend/android-app/`
    - Verify no compilation errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Run testDebug and verify all unit tests pass
    - Run `./gradlew testDebug` from `frontend/android-app/`
    - Verify all existing unit tests still pass (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
