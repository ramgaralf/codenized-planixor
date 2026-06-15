package com.codenized.planixor.data.sync

import com.codenized.planixor.domain.model.Reminder
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.arbitrary
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.choose
import io.kotest.property.arbitrary.constant
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.long
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for ReminderSyncManager sync logic.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh5-reminder-management
 */
@OptIn(ExperimentalKotest::class)
class ReminderSyncManagerPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    private val PREDEFINED_PALETTE = listOf(
        "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",
        "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",
        "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",
        "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",
        "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",
        "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",
        "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",
        "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",
        "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
    )

    // --- Generators ---

    /** Generates a random Reminder with configurable syncedAt and modifiedAt. */
    private val reminderArb: Arb<Reminder> = arbitrary {
        val id = Arb.string(8, 16).bind()
        val name = Arb.string(1, 50).bind()
        val icon = Arb.of("😀", "🌙", "☀️", "🏠", "🚗", "📝", "⏰", "🔔").bind()
        val color = Arb.of(PREDEFINED_PALETTE).bind()
        val isActive = Arb.boolean().bind()
        val createdAt = Arb.long(1_000_000_000_000L, 1_700_000_000_000L).bind()
        val modifiedAt = Arb.long(1_000_000_000_000L, 1_700_000_000_000L).bind()
        val syncedAt: Long? = Arb.choose(
            1 to Arb.constant(null),
            2 to Arb.long(1_000_000_000_000L, 1_700_000_000_000L).map { it as Long? },
        ).bind()
        val isDeleted = Arb.boolean().bind()

        Reminder(
            id = id,
            name = name,
            icon = icon,
            backgroundColor = color,
            isActive = isActive,
            createdAt = createdAt,
            modifiedAt = modifiedAt,
            syncedAt = syncedAt,
            isDeleted = isDeleted,
        )
    }

    /** Generates a Reminder that is unsynced (syncedAt == null). */
    private val unsyncedReminderArb: Arb<Reminder> = reminderArb.map { it.copy(syncedAt = null) }

    /** Generates a Reminder that is synced and NOT modified after sync (modifiedAt <= syncedAt). */
    private val syncedUnmodifiedReminderArb: Arb<Reminder> = arbitrary {
        val reminder = reminderArb.bind()
        val syncedAt = Arb.long(reminder.modifiedAt, reminder.modifiedAt + 100_000L).bind()
        reminder.copy(syncedAt = syncedAt)
    }

    /** Generates a Reminder that is synced but modified after sync (modifiedAt > syncedAt). */
    private val syncedModifiedReminderArb: Arb<Reminder> = arbitrary {
        val modifiedAt = Arb.long(1_000_000_001_000L, 1_700_000_000_000L).bind()
        val syncedAt = Arb.long(1_000_000_000_000L, modifiedAt - 1).bind()
        val reminder = reminderArb.bind()
        reminder.copy(modifiedAt = modifiedAt, syncedAt = syncedAt)
    }

    // --- Property 11: Push sync selects correct records and respects batch size ---

    /**
     * **Validates: Requirements 6.1**
     *
     * Property 11: Push sync selects correct records and respects batch size
     *
     * For any list of Reminders, getPushCandidates returns exactly those where
     * syncedAt == null OR modifiedAt > syncedAt.
     */
    @Test
    fun `Property 11 - getPushCandidates returns exactly reminders where syncedAt is null or modifiedAt greater than syncedAt`() = runTest {
        val manager = ReminderSyncManager()

        checkAll(config, Arb.list(reminderArb, 0..20)) { reminders ->
            val result = manager.getPushCandidates(reminders)

            val expected = reminders.filter { reminder ->
                reminder.syncedAt == null || reminder.modifiedAt > reminder.syncedAt
            }

            assertEquals(
                "Push candidates should match the filter predicate (syncedAt == null || modifiedAt > syncedAt)",
                expected.toSet(),
                result.toSet(),
            )
            assertEquals(
                "Push candidates count should match expected",
                expected.size,
                result.size,
            )
        }
    }

    @Test
    fun `Property 11 - unsynced reminders are always push candidates`() = runTest {
        val manager = ReminderSyncManager()

        checkAll(config, Arb.list(unsyncedReminderArb, 1..10)) { unsyncedReminders ->
            val result = manager.getPushCandidates(unsyncedReminders)

            assertEquals(
                "All unsynced reminders (syncedAt == null) should be push candidates",
                unsyncedReminders.size,
                result.size,
            )
        }
    }

    @Test
    fun `Property 11 - synced unmodified reminders are never push candidates`() = runTest {
        val manager = ReminderSyncManager()

        checkAll(config, Arb.list(syncedUnmodifiedReminderArb, 1..10)) { syncedReminders ->
            val result = manager.getPushCandidates(syncedReminders)

            assertTrue(
                "Reminders where modifiedAt <= syncedAt should not be push candidates",
                result.isEmpty(),
            )
        }
    }

    @Test
    fun `Property 11 - synced modified reminders are always push candidates`() = runTest {
        val manager = ReminderSyncManager()

        checkAll(config, Arb.list(syncedModifiedReminderArb, 1..10)) { modifiedReminders ->
            val result = manager.getPushCandidates(modifiedReminders)

            assertEquals(
                "All reminders where modifiedAt > syncedAt should be push candidates",
                modifiedReminders.size,
                result.size,
            )
        }
    }

    @Test
    fun `Property 11 - batchForPush produces batches of at most 100 records`() = runTest {
        val manager = ReminderSyncManager()

        // Generate larger lists to ensure batching occurs
        checkAll(config, Arb.list(reminderArb, 0..250)) { reminders ->
            val batches = manager.batchForPush(reminders)

            for (batch in batches) {
                assertTrue(
                    "Each batch must have at most ${ReminderSyncManager.MAX_BATCH_SIZE} records, got ${batch.size}",
                    batch.size <= ReminderSyncManager.MAX_BATCH_SIZE,
                )
            }

            // All records are present across batches
            val allBatched = batches.flatten()
            assertEquals(
                "Total batched records should equal input size",
                reminders.size,
                allBatched.size,
            )
            assertEquals(
                "Batched records should preserve input order and content",
                reminders,
                allBatched,
            )
        }
    }

    @Test
    fun `Property 11 - batchForPush number of batches is ceiling of size divided by 100`() = runTest {
        val manager = ReminderSyncManager()

        checkAll(config, Arb.list(reminderArb, 1..250)) { reminders ->
            val batches = manager.batchForPush(reminders)
            val expectedBatchCount = (reminders.size + ReminderSyncManager.MAX_BATCH_SIZE - 1) / ReminderSyncManager.MAX_BATCH_SIZE

            assertEquals(
                "Number of batches should be ceil(${reminders.size} / ${ReminderSyncManager.MAX_BATCH_SIZE})",
                expectedBatchCount,
                batches.size,
            )
        }
    }

    // --- Property 12: Conflict resolution applies last-writer-wins with remote tie-break ---

    /**
     * **Validates: Requirements 6.3**
     *
     * Property 12: Conflict resolution applies last-writer-wins with remote tie-break
     *
     * For any (local, remote) pair with same id:
     * - if remote.modifiedAt > local.modifiedAt → remote wins
     * - if local.modifiedAt > remote.modifiedAt → local wins
     * - if equal → remote wins
     */
    @Test
    fun `Property 12 - remote wins when remote modifiedAt is greater than local`() = runTest {
        val manager = ReminderSyncManager()

        val pairArb = arbitrary {
            val base = reminderArb.bind()
            val localModifiedAt = Arb.long(1_000_000_000_000L, 1_600_000_000_000L).bind()
            val remoteModifiedAt = Arb.long(localModifiedAt + 1, 1_700_000_000_000L).bind()
            val local = base.copy(modifiedAt = localModifiedAt)
            val remote = base.copy(modifiedAt = remoteModifiedAt)
            Pair(local, remote)
        }

        checkAll(config, pairArb) { (local, remote) ->
            val winner = manager.resolveConflict(local, remote)
            assertEquals(
                "Remote should win when remote.modifiedAt (${remote.modifiedAt}) > local.modifiedAt (${local.modifiedAt})",
                remote,
                winner,
            )
        }
    }

    @Test
    fun `Property 12 - local wins when local modifiedAt is greater than remote`() = runTest {
        val manager = ReminderSyncManager()

        val pairArb = arbitrary {
            val base = reminderArb.bind()
            val remoteModifiedAt = Arb.long(1_000_000_000_000L, 1_600_000_000_000L).bind()
            val localModifiedAt = Arb.long(remoteModifiedAt + 1, 1_700_000_000_000L).bind()
            val local = base.copy(modifiedAt = localModifiedAt)
            val remote = base.copy(modifiedAt = remoteModifiedAt)
            Pair(local, remote)
        }

        checkAll(config, pairArb) { (local, remote) ->
            val winner = manager.resolveConflict(local, remote)
            assertEquals(
                "Local should win when local.modifiedAt (${local.modifiedAt}) > remote.modifiedAt (${remote.modifiedAt})",
                local,
                winner,
            )
        }
    }

    @Test
    fun `Property 12 - remote wins on tie when modifiedAt values are equal`() = runTest {
        val manager = ReminderSyncManager()

        val pairArb = arbitrary {
            val base = reminderArb.bind()
            val modifiedAt = Arb.long(1_000_000_000_000L, 1_700_000_000_000L).bind()
            val local = base.copy(modifiedAt = modifiedAt)
            val remote = base.copy(modifiedAt = modifiedAt)
            Pair(local, remote)
        }

        checkAll(config, pairArb) { (local, remote) ->
            val winner = manager.resolveConflict(local, remote)
            assertEquals(
                "Remote should win on tie (both modifiedAt = ${local.modifiedAt})",
                remote,
                winner,
            )
        }
    }

    // --- Property 13: Pull merge inserts new and overwrites unmodified locals ---

    /**
     * **Validates: Requirements 6.5**
     *
     * Property 13: Pull merge inserts new and overwrites unmodified locals
     *
     * For any set of pulled remote records and local reminders:
     * - New IDs → toInsert with syncedAt set to now
     * - Existing IDs → conflict resolution applied, winner in toUpdate with syncedAt set to now
     */
    @Test
    fun `Property 13 - remote reminders not in local are placed in toInsert with syncedAt set to now`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ReminderSyncManager(clock = { clockTime })

        val testCaseArb = arbitrary {
            val localReminders = Arb.list(reminderArb, 0..10).bind()
            val localIds = localReminders.map { it.id }.toSet()
            val remoteCount = Arb.int(1, 10).bind()
            val remoteReminders = (1..remoteCount).map { i ->
                val reminder = reminderArb.bind()
                reminder.copy(id = "remote-unique-$i-${reminder.id}")
            }.filter { it.id !in localIds }
            Pair(localReminders, remoteReminders)
        }

        checkAll(config, testCaseArb) { (localReminders, remoteReminders) ->
            val localIds = localReminders.map { it.id }.toSet()
            val newRemotes = remoteReminders.filter { it.id !in localIds }

            val result = manager.mergePulledReminders(localReminders, newRemotes)

            assertEquals(
                "All new remote reminders should be in toInsert",
                newRemotes.size,
                result.toInsert.size,
            )

            for (inserted in result.toInsert) {
                assertEquals(
                    "Inserted reminder '${inserted.id}' should have syncedAt = clock time ($clockTime)",
                    clockTime,
                    inserted.syncedAt,
                )
            }
        }
    }

    @Test
    fun `Property 13 - inserted records preserve all fields except syncedAt`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ReminderSyncManager(clock = { clockTime })

        val testCaseArb = arbitrary {
            val remoteReminder = reminderArb.bind().copy(id = "unique-remote-${Arb.string(5, 10).bind()}")
            remoteReminder
        }

        checkAll(config, testCaseArb) { remoteReminder ->
            val result = manager.mergePulledReminders(emptyList(), listOf(remoteReminder))

            assertEquals("Should have exactly 1 inserted reminder", 1, result.toInsert.size)
            val inserted = result.toInsert.first()

            assertEquals("id should be preserved", remoteReminder.id, inserted.id)
            assertEquals("name should be preserved", remoteReminder.name, inserted.name)
            assertEquals("icon should be preserved", remoteReminder.icon, inserted.icon)
            assertEquals("backgroundColor should be preserved", remoteReminder.backgroundColor, inserted.backgroundColor)
            assertEquals("isActive should be preserved", remoteReminder.isActive, inserted.isActive)
            assertEquals("createdAt should be preserved", remoteReminder.createdAt, inserted.createdAt)
            assertEquals("modifiedAt should be preserved", remoteReminder.modifiedAt, inserted.modifiedAt)
            assertEquals("isDeleted should be preserved", remoteReminder.isDeleted, inserted.isDeleted)
            assertEquals("syncedAt should be set to clock time", clockTime, inserted.syncedAt)
        }
    }

    @Test
    fun `Property 13 - remote reminders that exist locally go to toUpdate with syncedAt set to now`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ReminderSyncManager(clock = { clockTime })

        val testCaseArb = arbitrary {
            val reminder = reminderArb.bind()
            val local = reminder.copy(modifiedAt = 1_500_000_000_000L)
            val remote = reminder.copy(modifiedAt = 1_600_000_000_000L)
            Pair(local, remote)
        }

        checkAll(config, testCaseArb) { (local, remote) ->
            val result = manager.mergePulledReminders(listOf(local), listOf(remote))

            assertTrue(
                "Remote reminder with existing local ID should NOT be in toInsert",
                result.toInsert.isEmpty(),
            )
            assertEquals(
                "Remote reminder with existing local ID should be in toUpdate",
                1,
                result.toUpdate.size,
            )
            assertEquals(
                "Updated reminder should have syncedAt = clock time ($clockTime)",
                clockTime,
                result.toUpdate.first().syncedAt,
            )
        }
    }

    @Test
    fun `Property 13 - conflict resolution winner is placed in toUpdate`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ReminderSyncManager(clock = { clockTime })

        // Case where local wins (local.modifiedAt > remote.modifiedAt)
        val localWinsArb = arbitrary {
            val reminder = reminderArb.bind()
            val remoteModifiedAt = Arb.long(1_000_000_000_000L, 1_500_000_000_000L).bind()
            val localModifiedAt = Arb.long(remoteModifiedAt + 1, 1_700_000_000_000L).bind()
            val local = reminder.copy(modifiedAt = localModifiedAt)
            val remote = reminder.copy(modifiedAt = remoteModifiedAt)
            Pair(local, remote)
        }

        checkAll(config, localWinsArb) { (local, remote) ->
            val result = manager.mergePulledReminders(listOf(local), listOf(remote))

            assertEquals("Should have exactly 1 update", 1, result.toUpdate.size)
            val updated = result.toUpdate.first()

            // Local wins conflict, so updated record should have local's modifiedAt
            assertEquals(
                "Winner should have local's modifiedAt since local.modifiedAt > remote.modifiedAt",
                local.modifiedAt,
                updated.modifiedAt,
            )
            assertEquals(
                "Winner should have syncedAt set to clock time",
                clockTime,
                updated.syncedAt,
            )
        }
    }

    @Test
    fun `Property 13 - mixed new and existing reminders are correctly partitioned`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ReminderSyncManager(clock = { clockTime })

        val testCaseArb = arbitrary {
            // Generate some local reminders
            val localCount = Arb.int(1, 5).bind()
            val localReminders = (1..localCount).map { i ->
                reminderArb.bind().copy(id = "local-$i", modifiedAt = 1_400_000_000_000L)
            }

            // Generate remote reminders: some with matching IDs (existing), some new
            val existingCount = Arb.int(1, localCount).bind()
            val newCount = Arb.int(1, 5).bind()

            val existingRemotes = localReminders.take(existingCount).map { local ->
                local.copy(modifiedAt = 1_600_000_000_000L)
            }
            val newRemotes = (1..newCount).map { i ->
                reminderArb.bind().copy(id = "new-remote-$i")
            }

            Triple(localReminders, existingRemotes + newRemotes, Pair(existingCount, newCount))
        }

        checkAll(config, testCaseArb) { (localReminders, remoteReminders, counts) ->
            val (expectedExisting, expectedNew) = counts
            val result = manager.mergePulledReminders(localReminders, remoteReminders)

            assertEquals(
                "toInsert should contain exactly the new remote reminders",
                expectedNew,
                result.toInsert.size,
            )
            assertEquals(
                "toUpdate should contain exactly the existing remote reminders",
                expectedExisting,
                result.toUpdate.size,
            )

            // All inserted and updated records should have syncedAt = clockTime
            for (r in result.toInsert + result.toUpdate) {
                assertEquals(
                    "All merged records should have syncedAt = clock time",
                    clockTime,
                    r.syncedAt,
                )
            }
        }
    }
}
