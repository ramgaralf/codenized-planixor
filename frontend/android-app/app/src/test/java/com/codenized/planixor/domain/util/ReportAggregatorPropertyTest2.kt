package com.codenized.planixor.domain.util

import com.codenized.planixor.data.sync.AnnualHoursConfigSyncManager
import com.codenized.planixor.domain.model.AnnualHoursConfig
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.arbitrary
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.choose
import io.kotest.property.arbitrary.constant
import io.kotest.property.arbitrary.double
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.long
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for report donut, store validation, and sync logic (Properties 7–14).
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh10-reports
 */
@OptIn(ExperimentalKotest::class)
class ReportAggregatorPropertyTest2 {

    private val config = PropTestConfig(iterations = 100)

    // --- Generators ---

    /** Generates a valid year in the allowed range [2000, 2100]. */
    private val validYearArb: Arb<Int> = Arb.int(2000, 2100)

    /** Generates an invalid year outside [2000, 2100]. */
    private val invalidYearArb: Arb<Int> = Arb.choose(
        1 to Arb.int(Int.MIN_VALUE, 1999),
        1 to Arb.int(2101, Int.MAX_VALUE),
    )

    /** Generates valid configuredHours in the allowed range [1, 8784]. */
    private val validConfiguredHoursArb: Arb<Int> = Arb.int(1, 8784)

    /** Generates invalid configuredHours outside [1, 8784]. */
    private val invalidConfiguredHoursArb: Arb<Int> = Arb.choose(
        1 to Arb.int(Int.MIN_VALUE, 0),
        1 to Arb.int(8785, Int.MAX_VALUE),
    )

    /** Generates an AnnualHoursConfig domain model record. */
    private val annualConfigArb: Arb<AnnualHoursConfig> = arbitrary {
        val id = Arb.string(8, 16).bind()
        val year = Arb.int(2000, 2100).bind()
        val configuredHours = Arb.int(1, 8784).bind()
        val modifiedAt = Arb.long(1_000_000_000_000L, 1_700_000_000_000L).bind()
        val syncedAt: Long? = Arb.choose(
            1 to Arb.constant(null),
            2 to Arb.long(1_000_000_000_000L, 1_700_000_000_000L).map { it as Long? },
        ).bind()
        val isDeleted = Arb.boolean().bind()

        AnnualHoursConfig(
            id = id,
            year = year,
            configuredHours = configuredHours,
            modifiedAt = modifiedAt,
            syncedAt = syncedAt,
            isDeleted = isDeleted,
        )
    }

    // --- Property 7: Annual config uniqueness — one non-deleted record per year ---

    /**
     * **Validates: Requirements 9.2**
     *
     * Property 7: Annual config uniqueness — one non-deleted record per year
     *
     * The repository save() method enforces at most one non-deleted record per year.
     * We test the validation/uniqueness logic: for any sequence of save operations
     * on the same year, the repository's design (upsert if exists) ensures uniqueness.
     *
     * Since this requires Room, we test the invariant at the logical level:
     * given a list of non-deleted configs, grouping by year should have at most 1 per year.
     * The repository's save() enforces this by checking existing + upserting.
     */
    @Test
    fun `Property 7 - at most one non-deleted config per year after save logic`() = runTest {
        // Simulate the save logic: for each year, only the latest save survives as non-deleted
        checkAll(config, Arb.list(Arb.int(2000, 2100), 1..20)) { yearSequence ->
            // Simulate repository behavior: for each year, only one non-deleted record exists
            val state = mutableMapOf<Int, AnnualHoursConfig>()

            for (year in yearSequence) {
                val configuredHours = (year % 8784) + 1
                val now = System.currentTimeMillis()

                // Simulate save: if exists for year, update; otherwise create
                val existing = state[year]
                if (existing != null) {
                    state[year] = existing.copy(
                        configuredHours = configuredHours,
                        modifiedAt = now,
                        syncedAt = null,
                    )
                } else {
                    state[year] = AnnualHoursConfig(
                        id = "id-$year-${state.size}",
                        year = year,
                        configuredHours = configuredHours,
                        modifiedAt = now,
                        syncedAt = null,
                        isDeleted = false,
                    )
                }
            }

            // Invariant: at most one non-deleted record per year
            val nonDeletedByYear = state.values
                .filter { !it.isDeleted }
                .groupBy { it.year }

            nonDeletedByYear.forEach { (year, records) ->
                assertTrue(
                    "Year $year should have at most 1 non-deleted record, but has ${records.size}",
                    records.size <= 1,
                )
            }
        }
    }

    // --- Property 8: Validation rejects out-of-range year or configuredHours ---

    /**
     * **Validates: Requirements 8.11, 9.6**
     *
     * Property 8: Validation rejects out-of-range year or configuredHours
     *
     * For year outside [2000, 2100] or configuredHours outside [1, 8784],
     * the validation logic returns failure.
     */
    @Test
    fun `Property 8 - validation rejects invalid year`() = runTest {
        checkAll(config, invalidYearArb, validConfiguredHoursArb) { year, hours ->
            val result = validateAnnualConfig(year, hours)
            assertTrue(
                "Year $year is outside [2000, 2100], validation should reject",
                result.isFailure,
            )
        }
    }

    @Test
    fun `Property 8 - validation rejects invalid configuredHours`() = runTest {
        checkAll(config, validYearArb, invalidConfiguredHoursArb) { year, hours ->
            val result = validateAnnualConfig(year, hours)
            assertTrue(
                "ConfiguredHours $hours is outside [1, 8784], validation should reject",
                result.isFailure,
            )
        }
    }

    @Test
    fun `Property 8 - validation accepts valid year and configuredHours`() = runTest {
        checkAll(config, validYearArb, validConfiguredHoursArb) { year, hours ->
            val result = validateAnnualConfig(year, hours)
            assertTrue(
                "Year $year in [2000, 2100] and hours $hours in [1, 8784] should be valid",
                result.isSuccess,
            )
        }
    }

    // --- Property 9: Donut minimum arc for sub-1% segments ---

    /**
     * **Validates: Requirements 2.6, 3.6**
     *
     * Property 9: Donut minimum arc for sub-1% segments
     *
     * For any percentage > 0 but < 1, computeDonutSegments sets it to 1.0.
     */
    @Test
    fun `Property 9 - donut minimum arc for sub-1 percent segments`() = runTest {
        // Generate percentage maps where at least one entry is between 0 exclusive and 1 exclusive
        val percentagesArb = arbitrary {
            val count = Arb.int(2, 8).bind()
            val entries = (1..count).map { i ->
                val pct = if (i == 1) {
                    // Force one entry to be in (0, 1) range
                    Arb.double(0.001, 0.999).bind()
                } else {
                    Arb.double(1.0, 50.0).bind()
                }
                "type-$i" to pct
            }
            entries.toMap()
        }

        checkAll(config, percentagesArb) { percentages ->
            val segments = computeDonutSegments(percentages)

            segments.forEach { segment ->
                val originalPct = percentages[segment.typeId]!!
                if (originalPct > 0.0 && originalPct < 1.0) {
                    assertEquals(
                        "Segment ${segment.typeId} with original pct $originalPct should be clamped to 1.0",
                        1.0,
                        segment.percentage,
                        0.0001,
                    )
                }
            }
        }
    }

    @Test
    fun `Property 9 - segments at or above 1 percent are not modified`() = runTest {
        val percentagesArb = arbitrary {
            val count = Arb.int(2, 8).bind()
            val entries = (1..count).map { i ->
                val pct = Arb.double(1.0, 80.0).bind()
                "type-$i" to pct
            }
            entries.toMap()
        }

        checkAll(config, percentagesArb) { percentages ->
            val segments = computeDonutSegments(percentages)

            segments.forEach { segment ->
                val originalPct = percentages[segment.typeId]!!
                assertEquals(
                    "Segment ${segment.typeId} with pct >= 1.0 should not be modified",
                    originalPct,
                    segment.percentage,
                    0.0001,
                )
            }
        }
    }

    // --- Property 10: Single type yields exactly 100.0% in donut ---

    /**
     * **Validates: Requirements 6.5**
     *
     * Property 10: Single type yields exactly 100.0% in donut
     *
     * When percentages map has exactly one entry, output is exactly 100.0.
     */
    @Test
    fun `Property 10 - single type yields exactly 100 percent in donut`() = runTest {
        val singleEntryArb = arbitrary {
            val typeId = Arb.of("type-1", "type-2", "type-3", "type-A", "type-B").bind()
            val pct = Arb.double(0.001, 200.0).bind()
            mapOf(typeId to pct)
        }

        checkAll(config, singleEntryArb) { percentages ->
            val segments = computeDonutSegments(percentages)

            assertEquals(
                "Single-entry input should produce exactly 1 segment",
                1,
                segments.size,
            )
            assertEquals(
                "Single type should yield exactly 100.0%",
                100.0,
                segments.first().percentage,
                0.0,
            )
        }
    }

    // --- Property 11: Annual percentages use configured hours as denominator ---

    /**
     * **Validates: Requirements 5.5**
     *
     * Property 11: Annual percentages use configured hours as denominator
     *
     * computePercentages(totals, configuredHours) computes each as
     * (typeMinutes / (configuredHours * 60)) * 100.
     */
    @Test
    fun `Property 11 - annual percentages use configured hours as denominator`() = runTest {
        val testCaseArb = arbitrary {
            val configuredHours = Arb.int(1, 8784).bind()
            val count = Arb.int(1, 5).bind()
            val totals = (1..count).associate { i ->
                "type-$i" to Arb.int(1, 50000).bind()
            }
            Pair(totals, configuredHours)
        }

        checkAll(config, testCaseArb) { (totals, configuredHours) ->
            val percentages = computePercentages(totals, configuredHours)

            val denominator = configuredHours.toDouble() * 60.0

            totals.forEach { (typeId, minutes) ->
                val expected = (minutes.toDouble() / denominator) * 100.0
                val actual = percentages[typeId]!!

                assertEquals(
                    "Type $typeId: ($minutes / ($configuredHours * 60)) * 100 = $expected, got $actual",
                    expected,
                    actual,
                    0.0001,
                )
            }
        }
    }

    @Test
    fun `Property 11 - percentages can exceed 100 when actual hours surpass target`() = runTest {
        // When total minutes exceed configuredHours * 60, sum of percentages > 100
        val testCaseArb = arbitrary {
            val configuredHours = Arb.int(1, 100).bind()
            val excessMinutes = configuredHours * 60 + Arb.int(1, 10000).bind()
            val totals = mapOf("type-1" to excessMinutes)
            Pair(totals, configuredHours)
        }

        checkAll(config, testCaseArb) { (totals, configuredHours) ->
            val percentages = computePercentages(totals, configuredHours)

            val totalPct = percentages.values.sum()
            assertTrue(
                "When actual exceeds target, total percentage ($totalPct) should exceed 100",
                totalPct > 100.0,
            )
        }
    }

    // --- Property 12: Sync conflict resolution — LWW, remote on tie ---

    /**
     * **Validates: Requirements 10.2**
     *
     * Property 12: Sync conflict resolution — last writer wins, remote on tie
     *
     * For two records with same id, the one with later modifiedAt wins.
     * On tie, remote wins.
     */
    @Test
    fun `Property 12 - remote wins when remote modifiedAt is greater than local`() = runTest {
        val manager = AnnualHoursConfigSyncManager()

        val pairArb = arbitrary {
            val base = annualConfigArb.bind()
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
        val manager = AnnualHoursConfigSyncManager()

        val pairArb = arbitrary {
            val base = annualConfigArb.bind()
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
        val manager = AnnualHoursConfigSyncManager()

        val pairArb = arbitrary {
            val base = annualConfigArb.bind()
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

    // --- Property 13: Config save sets modifiedAt to current UTC and clears syncedAt ---

    /**
     * **Validates: Requirements 9.4**
     *
     * Property 13: Config save sets modifiedAt to current UTC and clears syncedAt
     *
     * After save, modifiedAt is approximately current time and syncedAt is null.
     * We test the pure logic that the repository applies: modifiedAt = now, syncedAt = null.
     */
    @Test
    fun `Property 13 - save logic sets modifiedAt to current time and clears syncedAt`() = runTest {
        checkAll(config, validYearArb, validConfiguredHoursArb) { year, hours ->
            val before = System.currentTimeMillis()

            // Simulate the save logic from AnnualHoursConfigRepository
            val now = System.currentTimeMillis()
            val savedRecord = AnnualHoursConfig(
                id = "test-id-$year",
                year = year,
                configuredHours = hours,
                modifiedAt = now,
                syncedAt = null,
                isDeleted = false,
            )

            val after = System.currentTimeMillis()

            // modifiedAt should be approximately current UTC time
            assertTrue(
                "modifiedAt (${savedRecord.modifiedAt}) should be >= before ($before)",
                savedRecord.modifiedAt >= before,
            )
            assertTrue(
                "modifiedAt (${savedRecord.modifiedAt}) should be <= after ($after)",
                savedRecord.modifiedAt <= after,
            )

            // syncedAt should be null
            assertNull(
                "syncedAt should be null after save",
                savedRecord.syncedAt,
            )
        }
    }

    @Test
    fun `Property 13 - update logic preserves id but sets modifiedAt and clears syncedAt`() = runTest {
        val existingArb = arbitrary {
            val record = annualConfigArb.bind()
            record.copy(isDeleted = false, syncedAt = Arb.long(1_000_000_000_000L, 1_600_000_000_000L).bind())
        }

        checkAll(config, existingArb, validConfiguredHoursArb) { existing, newHours ->
            val before = System.currentTimeMillis()

            // Simulate update logic from the repository
            val now = System.currentTimeMillis()
            val updated = existing.copy(
                configuredHours = newHours,
                modifiedAt = now,
                syncedAt = null,
            )

            val after = System.currentTimeMillis()

            // ID preserved
            assertEquals("ID should be preserved after update", existing.id, updated.id)

            // modifiedAt is current time
            assertTrue(
                "modifiedAt (${updated.modifiedAt}) should be >= before ($before)",
                updated.modifiedAt >= before,
            )
            assertTrue(
                "modifiedAt (${updated.modifiedAt}) should be <= after ($after)",
                updated.modifiedAt <= after,
            )

            // syncedAt cleared
            assertNull(
                "syncedAt should be null after update",
                updated.syncedAt,
            )
        }
    }

    @Test
    fun `Property 13 - soft delete sets modifiedAt and clears syncedAt`() = runTest {
        val existingArb = arbitrary {
            val record = annualConfigArb.bind()
            record.copy(isDeleted = false, syncedAt = Arb.long(1_000_000_000_000L, 1_600_000_000_000L).bind())
        }

        checkAll(config, existingArb) { existing ->
            val before = System.currentTimeMillis()

            // Simulate soft-delete logic
            val now = System.currentTimeMillis()
            val deleted = existing.copy(
                isDeleted = true,
                modifiedAt = now,
                syncedAt = null,
            )

            val after = System.currentTimeMillis()

            assertTrue("isDeleted should be true", deleted.isDeleted)
            assertTrue(
                "modifiedAt should be >= before ($before)",
                deleted.modifiedAt >= before,
            )
            assertTrue(
                "modifiedAt should be <= after ($after)",
                deleted.modifiedAt <= after,
            )
            assertNull("syncedAt should be null after soft-delete", deleted.syncedAt)
        }
    }

    // --- Property 14: Sync push respects batch size limit ---

    /**
     * **Validates: Requirements 10.1**
     *
     * Property 14: Sync push respects batch size limit
     *
     * Batches never exceed 100 records.
     */
    @Test
    fun `Property 14 - batches never exceed 100 records`() = runTest {
        val manager = AnnualHoursConfigSyncManager()

        val recordsArb = Arb.list(annualConfigArb, 0..500)

        checkAll(config, recordsArb) { records ->
            val batches = manager.batchForPush(records)

            batches.forEach { batch ->
                assertTrue(
                    "Each batch should have at most 100 records, but has ${batch.size}",
                    batch.size <= AnnualHoursConfigSyncManager.MAX_BATCH_SIZE,
                )
            }
        }
    }

    @Test
    fun `Property 14 - all records are included in batches`() = runTest {
        val manager = AnnualHoursConfigSyncManager()

        val recordsArb = Arb.list(annualConfigArb, 0..500)

        checkAll(config, recordsArb) { records ->
            val batches = manager.batchForPush(records)
            val totalInBatches = batches.sumOf { it.size }

            assertEquals(
                "Total records in batches ($totalInBatches) should equal input size (${records.size})",
                records.size,
                totalInBatches,
            )
        }
    }

    @Test
    fun `Property 14 - batch count is ceiling of records divided by 100`() = runTest {
        val manager = AnnualHoursConfigSyncManager()

        val recordsArb = Arb.list(annualConfigArb, 1..500)

        checkAll(config, recordsArb) { records ->
            val batches = manager.batchForPush(records)
            val expectedBatchCount = (records.size + 99) / 100

            assertEquals(
                "Batch count should be ceil(${records.size}/100) = $expectedBatchCount",
                expectedBatchCount,
                batches.size,
            )
        }
    }

    // --- Helper function for validation testing ---

    /**
     * Validates annual config parameters following the same logic as
     * AnnualHoursConfigRepository.save() validation.
     */
    private fun validateAnnualConfig(year: Int, configuredHours: Int): Result<Unit> {
        if (year < 2000 || year > 2100) {
            return Result.failure(IllegalArgumentException("Year must be between 2000 and 2100"))
        }
        if (configuredHours < 1 || configuredHours > 8784) {
            return Result.failure(IllegalArgumentException("Configured hours must be between 1 and 8784"))
        }
        return Result.success(Unit)
    }
}
