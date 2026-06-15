package com.codenized.planixor.data.sync

import com.codenized.planixor.domain.model.Shift
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.arbitrary
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.choose
import io.kotest.property.arbitrary.constant
import io.kotest.property.arbitrary.filter
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
 * Property-based tests for ShiftSyncManager sync logic.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh3-shift-management
 */
@OptIn(ExperimentalKotest::class)
class ShiftSyncManagerPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    private val PREDEFINED_PALETTE = listOf(
        "#EF4444", "#F97316", "#F59E0B", "#10B981", "#0B86D4",
        "#2563EB", "#7C3AED", "#EC4899", "#6B7280", "#1F2937",
    )

    // --- Generators ---

    /** Generates a random Shift with configurable syncedAt and modifiedAt. */
    private val shiftArb: Arb<Shift> = arbitrary {
        val id = Arb.string(8, 16).bind()
        val name = Arb.string(1, 50).bind()
        val icon = Arb.of("😀", "🌙", "☀️", "🏠", "🚗").bind()
        val color = Arb.of(PREDEFINED_PALETTE).bind()
        val startTime = Arb.int(0, 1439).bind()
        val endTime = Arb.int(0, 1439).bind()
        val hoursWorked = Arb.int(1, 1440).bind()
        val isActive = Arb.boolean().bind()
        val createdAt = Arb.long(1_000_000_000_000L, 1_700_000_000_000L).bind()
        val modifiedAt = Arb.long(1_000_000_000_000L, 1_700_000_000_000L).bind()
        val syncedAt: Long? = Arb.choose(
            1 to Arb.constant(null),
            2 to Arb.long(1_000_000_000_000L, 1_700_000_000_000L).map { it as Long? },
        ).bind()
        val isDeleted = Arb.boolean().bind()

        Shift(
            id = id,
            name = name,
            icon = icon,
            backgroundColor = color,
            startTime = startTime,
            endTime = endTime,
            hoursWorked = hoursWorked,
            isActive = isActive,
            createdAt = createdAt,
            modifiedAt = modifiedAt,
            syncedAt = syncedAt,
            isDeleted = isDeleted,
        )
    }

    /** Generates a Shift that is unsynced (syncedAt == null). */
    private val unsyncedShiftArb: Arb<Shift> = shiftArb.map { it.copy(syncedAt = null) }

    /** Generates a Shift that is synced and NOT modified after sync (modifiedAt <= syncedAt). */
    private val syncedUnmodifiedShiftArb: Arb<Shift> = arbitrary {
        val shift = shiftArb.bind()
        val syncedAt = Arb.long(shift.modifiedAt, shift.modifiedAt + 100_000L).bind()
        shift.copy(syncedAt = syncedAt)
    }

    /** Generates a Shift that is synced but modified after sync (modifiedAt > syncedAt). */
    private val syncedModifiedShiftArb: Arb<Shift> = arbitrary {
        val modifiedAt = Arb.long(1_000_000_001_000L, 1_700_000_000_000L).bind()
        val syncedAt = Arb.long(1_000_000_000_000L, modifiedAt - 1).bind()
        val shift = shiftArb.bind()
        shift.copy(modifiedAt = modifiedAt, syncedAt = syncedAt)
    }

    // --- Property 8: Sync push filter selects unsynced records ---

    /**
     * **Validates: Requirements 6.1**
     *
     * Property 8: Sync push filter selects unsynced records
     *
     * For any list of Shifts, getPushCandidates returns exactly those where
     * syncedAt == null OR modifiedAt > syncedAt.
     */
    @Test
    fun `Property 8 - getPushCandidates returns exactly shifts where syncedAt is null or modifiedAt greater than syncedAt`() = runTest {
        val manager = ShiftSyncManager()

        checkAll(config, Arb.list(shiftArb, 0..20)) { shifts ->
            val result = manager.getPushCandidates(shifts)

            val expected = shifts.filter { shift ->
                shift.syncedAt == null || shift.modifiedAt > shift.syncedAt
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
    fun `Property 8 - unsynced shifts are always push candidates`() = runTest {
        val manager = ShiftSyncManager()

        checkAll(config, Arb.list(unsyncedShiftArb, 1..10)) { unsyncedShifts ->
            val result = manager.getPushCandidates(unsyncedShifts)

            assertEquals(
                "All unsynced shifts (syncedAt == null) should be push candidates",
                unsyncedShifts.size,
                result.size,
            )
        }
    }

    @Test
    fun `Property 8 - synced unmodified shifts are never push candidates`() = runTest {
        val manager = ShiftSyncManager()

        checkAll(config, Arb.list(syncedUnmodifiedShiftArb, 1..10)) { syncedShifts ->
            val result = manager.getPushCandidates(syncedShifts)

            assertTrue(
                "Shifts where modifiedAt <= syncedAt should not be push candidates",
                result.isEmpty(),
            )
        }
    }

    @Test
    fun `Property 8 - synced modified shifts are always push candidates`() = runTest {
        val manager = ShiftSyncManager()

        checkAll(config, Arb.list(syncedModifiedShiftArb, 1..10)) { modifiedShifts ->
            val result = manager.getPushCandidates(modifiedShifts)

            assertEquals(
                "All shifts where modifiedAt > syncedAt should be push candidates",
                modifiedShifts.size,
                result.size,
            )
        }
    }

    // --- Property 9: Conflict resolution — last writer wins with remote tie-break ---

    /**
     * **Validates: Requirements 6.3**
     *
     * Property 9: Conflict resolution — last writer wins with remote tie-break
     *
     * For any (local, remote) pair with same id:
     * - if remote.modifiedAt > local.modifiedAt → remote wins
     * - if local.modifiedAt > remote.modifiedAt → local wins
     * - if equal → remote wins
     */
    @Test
    fun `Property 9 - remote wins when remote modifiedAt is greater than local`() = runTest {
        val manager = ShiftSyncManager()

        val pairArb = arbitrary {
            val base = shiftArb.bind()
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
    fun `Property 9 - local wins when local modifiedAt is greater than remote`() = runTest {
        val manager = ShiftSyncManager()

        val pairArb = arbitrary {
            val base = shiftArb.bind()
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
    fun `Property 9 - remote wins on tie when modifiedAt values are equal`() = runTest {
        val manager = ShiftSyncManager()

        val pairArb = arbitrary {
            val base = shiftArb.bind()
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

    // --- Property 10: Pull merge inserts new remote records ---

    /**
     * **Validates: Requirements 6.5**
     *
     * Property 10: Pull merge inserts new remote records
     *
     * For any remote Shift whose id is not in localShifts, mergePulledShifts places
     * it in toInsert with syncedAt set to a recent timestamp (>= clock time).
     */
    @Test
    fun `Property 10 - remote shifts not in local are placed in toInsert with syncedAt set to now`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ShiftSyncManager(clock = { clockTime })

        // Generate local shifts with unique IDs, and remote shifts with different IDs
        val testCaseArb = arbitrary {
            val localShifts = Arb.list(shiftArb, 0..10).bind()
            val localIds = localShifts.map { it.id }.toSet()
            // Generate remote shifts with IDs guaranteed to not be in localIds
            val remoteCount = Arb.int(1, 10).bind()
            val remoteShifts = (1..remoteCount).map { i ->
                val shift = shiftArb.bind()
                shift.copy(id = "remote-unique-$i-${shift.id}")
            }.filter { it.id !in localIds }
            Pair(localShifts, remoteShifts)
        }

        checkAll(config, testCaseArb) { (localShifts, remoteShifts) ->
            val localIds = localShifts.map { it.id }.toSet()
            // Verify precondition: all remote IDs are not in local
            val newRemotes = remoteShifts.filter { it.id !in localIds }

            val result = manager.mergePulledShifts(localShifts, newRemotes)

            assertEquals(
                "All new remote shifts should be in toInsert",
                newRemotes.size,
                result.toInsert.size,
            )

            for (inserted in result.toInsert) {
                assertTrue(
                    "Inserted shift '${inserted.id}' should have syncedAt >= clock time ($clockTime)",
                    inserted.syncedAt != null && inserted.syncedAt >= clockTime,
                )
            }
        }
    }

    @Test
    fun `Property 10 - inserted records preserve all fields except syncedAt`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ShiftSyncManager(clock = { clockTime })

        val testCaseArb = arbitrary {
            val remoteShift = shiftArb.bind().copy(id = "unique-remote-${Arb.string(5, 10).bind()}")
            remoteShift
        }

        checkAll(config, testCaseArb) { remoteShift ->
            val result = manager.mergePulledShifts(emptyList(), listOf(remoteShift))

            assertEquals("Should have exactly 1 inserted shift", 1, result.toInsert.size)
            val inserted = result.toInsert.first()

            assertEquals("id should be preserved", remoteShift.id, inserted.id)
            assertEquals("name should be preserved", remoteShift.name, inserted.name)
            assertEquals("icon should be preserved", remoteShift.icon, inserted.icon)
            assertEquals("backgroundColor should be preserved", remoteShift.backgroundColor, inserted.backgroundColor)
            assertEquals("startTime should be preserved", remoteShift.startTime, inserted.startTime)
            assertEquals("endTime should be preserved", remoteShift.endTime, inserted.endTime)
            assertEquals("hoursWorked should be preserved", remoteShift.hoursWorked, inserted.hoursWorked)
            assertEquals("isActive should be preserved", remoteShift.isActive, inserted.isActive)
            assertEquals("createdAt should be preserved", remoteShift.createdAt, inserted.createdAt)
            assertEquals("modifiedAt should be preserved", remoteShift.modifiedAt, inserted.modifiedAt)
            assertEquals("isDeleted should be preserved", remoteShift.isDeleted, inserted.isDeleted)
            assertEquals("syncedAt should be set to clock time", clockTime, inserted.syncedAt)
        }
    }

    @Test
    fun `Property 10 - remote shifts that exist locally go to toUpdate not toInsert`() = runTest {
        val clockTime = 1_700_000_000_000L
        val manager = ShiftSyncManager(clock = { clockTime })

        val testCaseArb = arbitrary {
            val shift = shiftArb.bind()
            val local = shift.copy(modifiedAt = 1_500_000_000_000L)
            val remote = shift.copy(modifiedAt = 1_600_000_000_000L)
            Pair(local, remote)
        }

        checkAll(config, testCaseArb) { (local, remote) ->
            val result = manager.mergePulledShifts(listOf(local), listOf(remote))

            assertTrue(
                "Remote shift with existing local ID should NOT be in toInsert",
                result.toInsert.isEmpty(),
            )
            assertEquals(
                "Remote shift with existing local ID should be in toUpdate",
                1,
                result.toUpdate.size,
            )
        }
    }
}
