package com.codenized.planixor.data.local

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.collections.shouldBeSortedWith
import io.kotest.matchers.longs.shouldBeGreaterThanOrEqual
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotBeEmpty
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.arbitrary
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.long
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.junit.runner.RunWith

/**
 * Fake in-memory ShiftDao implementation for property testing.
 * Replicates the Room query behavior without requiring Android context.
 */
class FakeShiftDao : ShiftDao {
    private val store = mutableMapOf<String, ShiftEntity>()
    private val flow = MutableStateFlow<List<ShiftEntity>>(emptyList())

    private fun emitUpdate() {
        flow.value = store.values
            .filter { !it.isDeleted }
            .sortedBy { it.createdAt }
    }

    override fun getAllActive(): Flow<List<ShiftEntity>> {
        return flow.map { it.toList() }
    }

    override suspend fun getById(id: String): ShiftEntity? {
        return store[id]
    }

    override suspend fun upsert(shift: ShiftEntity) {
        store[shift.id] = shift
        emitUpdate()
    }

    override suspend fun softDelete(id: String, now: Long) {
        store[id]?.let { existing ->
            store[id] = existing.copy(isDeleted = true, modifiedAt = now, syncedAt = null)
            emitUpdate()
        }
    }

    override suspend fun setActive(id: String, isActive: Boolean, now: Long) {
        store[id]?.let { existing ->
            store[id] = existing.copy(isActive = isActive, modifiedAt = now)
            emitUpdate()
        }
    }

    override suspend fun getUnsynced(): List<ShiftEntity> {
        return store.values.filter { it.syncedAt == null || it.modifiedAt > (it.syncedAt ?: 0) }
    }

    override suspend fun getAll(): List<ShiftEntity> {
        return store.values.toList()
    }

    override suspend fun upsertAll(shifts: List<ShiftEntity>) {
        shifts.forEach { store[it.id] = it }
        emitUpdate()
    }

    override suspend fun deleteAll() {
        store.clear()
        emitUpdate()
    }

    fun clear() {
        store.clear()
        emitUpdate()
    }
}


/**
 * Property-based tests for ShiftRepository using Kotest with JUnit 4 runner.
 *
 * Validates: Requirements 1.1, 2.1, 3.2, 4.2, 4.5, 4.7, 5.2, 5.4
 */
@RunWith(io.kotest.runner.junit4.KotestTestRunner::class)
@OptIn(ExperimentalKotest::class)
class ShiftRepositoryPropertyTest : FunSpec({

    val propConfig = PropTestConfig(iterations = 100)

    // --- Generators ---

    val arbShiftName = Arb.string(minSize = 1, maxSize = 50)
    val arbIcon = Arb.string(minSize = 1, maxSize = 5)
    val arbColor = Arb.string(minSize = 7, maxSize = 7)
    val arbTime = Arb.int(min = 0, max = 1439)
    val arbHoursWorked = Arb.int(min = 1, max = 1440)

    data class ShiftInput(
        val name: String,
        val icon: String,
        val backgroundColor: String,
        val startTime: Int,
        val endTime: Int,
        val hoursWorked: Int,
    )

    val arbShiftInput = arbitrary {
        ShiftInput(
            name = arbShiftName.bind(),
            icon = arbIcon.bind(),
            backgroundColor = arbColor.bind(),
            startTime = arbTime.bind(),
            endTime = arbTime.bind(),
            hoursWorked = arbHoursWorked.bind(),
        )
    }

    // --- Property 1: Shift creation persists correct system fields ---

    test("Property 1: Shift creation persists correct system fields") {
        /**
         * Validates: Requirements 1.1
         *
         * For any valid shift creation input, the resulting shift has:
         * - UUID id (non-empty)
         * - modifiedAt >= before
         * - syncedAt = null
         * - isDeleted = false
         * - isActive = true
         * - all user-provided field values preserved exactly
         */
        checkAll(propConfig, arbShiftInput) { input ->
            val fakeDao = FakeShiftDao()
            val repository = ShiftRepository(fakeDao)

            val before = System.currentTimeMillis()
            val result = repository.create(
                name = input.name,
                icon = input.icon,
                backgroundColor = input.backgroundColor,
                startTime = input.startTime,
                endTime = input.endTime,
                hoursWorked = input.hoursWorked,
            )

            // UUID id is non-empty
            result.id.shouldNotBeEmpty()

            // modifiedAt >= before
            result.modifiedAt.shouldBeGreaterThanOrEqual(before)

            // syncedAt is null
            result.syncedAt.shouldBeNull()

            // isDeleted is false
            result.isDeleted.shouldBeFalse()

            // isActive is true
            result.isActive.shouldBeTrue()

            // User-provided fields preserved
            result.name shouldBe input.name
            result.icon shouldBe input.icon
            result.backgroundColor shouldBe input.backgroundColor
            result.startTime shouldBe input.startTime
            result.endTime shouldBe input.endTime
            result.hoursWorked shouldBe input.hoursWorked
        }
    }

    // --- Property 4: Shift listing filter and ordering ---

    test("Property 4: Shift listing filter and ordering") {
        /**
         * Validates: Requirements 2.1, 5.4
         *
         * For any collection of shifts with mixed isDeleted values,
         * getAllActive returns exactly those where isDeleted = false,
         * ordered by createdAt ASC.
         */
        val arbShiftEntity = arbitrary {
            ShiftEntity(
                id = java.util.UUID.randomUUID().toString(),
                name = arbShiftName.bind(),
                icon = arbIcon.bind(),
                backgroundColor = arbColor.bind(),
                startTime = arbTime.bind(),
                endTime = arbTime.bind(),
                hoursWorked = arbHoursWorked.bind(),
                isActive = Arb.boolean().bind(),
                createdAt = Arb.long(min = 1_000_000L, max = 9_999_999_999L).bind(),
                modifiedAt = Arb.long(min = 1_000_000L, max = 9_999_999_999L).bind(),
                syncedAt = null,
                isDeleted = Arb.boolean().bind(),
            )
        }

        checkAll(propConfig, Arb.list(arbShiftEntity, range = 0..20)) { entities ->
            val fakeDao = FakeShiftDao()
            val repository = ShiftRepository(fakeDao)

            // Insert all entities directly via the DAO
            entities.forEach { fakeDao.upsert(it) }

            // Collect the result
            val result = repository.getAllActive().first()

            // DAO uses UPSERT so last entry per ID wins.
            // Build the expected state after all upserts:
            val finalState = mutableMapOf<String, ShiftEntity>()
            entities.forEach { finalState[it.id] = it }

            val expectedIds = finalState.values
                .filter { !it.isDeleted }
                .sortedBy { it.createdAt }
                .map { it.id }

            result.map { it.id } shouldBe expectedIds

            // Should be sorted by createdAt ASC
            result.shouldBeSortedWith(compareBy { it.createdAt })
        }
    }

    // --- Property 5: Shift update preserves identity fields ---

    test("Property 5: Shift update preserves identity fields") {
        /**
         * Validates: Requirements 3.2
         *
         * For any shift and valid modifications, update preserves
         * id/syncedAt/isDeleted, sets modifiedAt >= before.
         */
        val arbModification = arbitrary {
            ShiftInput(
                name = arbShiftName.bind(),
                icon = arbIcon.bind(),
                backgroundColor = arbColor.bind(),
                startTime = arbTime.bind(),
                endTime = arbTime.bind(),
                hoursWorked = arbHoursWorked.bind(),
            )
        }

        checkAll(propConfig, arbShiftInput, arbModification) { original, modification ->
            val fakeDao = FakeShiftDao()
            val repository = ShiftRepository(fakeDao)

            // Create a shift first
            val created = repository.create(
                name = original.name,
                icon = original.icon,
                backgroundColor = original.backgroundColor,
                startTime = original.startTime,
                endTime = original.endTime,
                hoursWorked = original.hoursWorked,
            )

            val before = System.currentTimeMillis()

            // Update the shift
            repository.update(
                id = created.id,
                name = modification.name,
                icon = modification.icon,
                backgroundColor = modification.backgroundColor,
                startTime = modification.startTime,
                endTime = modification.endTime,
                hoursWorked = modification.hoursWorked,
            )

            // Retrieve updated shift
            val updated = repository.getById(created.id)!!

            // id is preserved
            updated.id shouldBe created.id

            // syncedAt is preserved (was null from creation)
            updated.syncedAt shouldBe created.syncedAt

            // isDeleted is preserved
            updated.isDeleted shouldBe created.isDeleted

            // modifiedAt >= before
            updated.modifiedAt.shouldBeGreaterThanOrEqual(before)

            // New field values are persisted
            updated.name shouldBe modification.name
            updated.icon shouldBe modification.icon
            updated.backgroundColor shouldBe modification.backgroundColor
            updated.startTime shouldBe modification.startTime
            updated.endTime shouldBe modification.endTime
            updated.hoursWorked shouldBe modification.hoursWorked
        }
    }

    // --- Property 6: Toggle active status ---

    test("Property 6: Toggle active status") {
        /**
         * Validates: Requirements 4.2, 4.5
         *
         * For any shift, toggleActive flips isActive and updates modifiedAt.
         */
        checkAll(propConfig, arbShiftInput) { input ->
            val fakeDao = FakeShiftDao()
            val repository = ShiftRepository(fakeDao)

            // Create a shift (isActive = true by default)
            val created = repository.create(
                name = input.name,
                icon = input.icon,
                backgroundColor = input.backgroundColor,
                startTime = input.startTime,
                endTime = input.endTime,
                hoursWorked = input.hoursWorked,
            )

            created.isActive.shouldBeTrue()

            val beforeToggle = System.currentTimeMillis()

            // Toggle to inactive
            repository.toggleActive(created.id)
            val afterFirstToggle = repository.getById(created.id)!!

            afterFirstToggle.isActive.shouldBeFalse()
            afterFirstToggle.modifiedAt.shouldBeGreaterThanOrEqual(beforeToggle)

            // All other fields should be preserved
            afterFirstToggle.id shouldBe created.id
            afterFirstToggle.name shouldBe created.name
            afterFirstToggle.icon shouldBe created.icon
            afterFirstToggle.backgroundColor shouldBe created.backgroundColor
            afterFirstToggle.startTime shouldBe created.startTime
            afterFirstToggle.endTime shouldBe created.endTime
            afterFirstToggle.hoursWorked shouldBe created.hoursWorked
            afterFirstToggle.syncedAt shouldBe created.syncedAt
            afterFirstToggle.isDeleted shouldBe created.isDeleted

            val beforeSecondToggle = System.currentTimeMillis()

            // Toggle back to active
            repository.toggleActive(created.id)
            val afterSecondToggle = repository.getById(created.id)!!

            afterSecondToggle.isActive.shouldBeTrue()
            afterSecondToggle.modifiedAt.shouldBeGreaterThanOrEqual(beforeSecondToggle)
        }
    }

    // --- Property 7: Soft delete sets correct flags ---

    test("Property 7: Soft delete sets correct flags") {
        /**
         * Validates: Requirements 5.2
         *
         * For any shift, softDelete sets isDeleted = true, syncedAt = null,
         * modifiedAt >= before.
         */
        checkAll(propConfig, arbShiftInput) { input ->
            val fakeDao = FakeShiftDao()
            val repository = ShiftRepository(fakeDao)

            // Create a shift
            val created = repository.create(
                name = input.name,
                icon = input.icon,
                backgroundColor = input.backgroundColor,
                startTime = input.startTime,
                endTime = input.endTime,
                hoursWorked = input.hoursWorked,
            )

            val beforeDelete = System.currentTimeMillis()

            // Soft delete
            repository.softDelete(created.id)

            // Retrieve via DAO directly (getById still works on deleted)
            val deleted = repository.getById(created.id)!!

            // isDeleted = true
            deleted.isDeleted.shouldBeTrue()

            // syncedAt = null
            deleted.syncedAt.shouldBeNull()

            // modifiedAt >= before
            deleted.modifiedAt.shouldBeGreaterThanOrEqual(beforeDelete)

            // Content fields preserved
            deleted.id shouldBe created.id
            deleted.name shouldBe created.name
            deleted.icon shouldBe created.icon
            deleted.backgroundColor shouldBe created.backgroundColor
            deleted.startTime shouldBe created.startTime
            deleted.endTime shouldBe created.endTime
            deleted.hoursWorked shouldBe created.hoursWorked
        }
    }
})
