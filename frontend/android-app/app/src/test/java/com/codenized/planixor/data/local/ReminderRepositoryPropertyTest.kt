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
 * Fake in-memory ReminderDao implementation for property testing.
 * Replicates the Room query behavior without requiring Android context.
 */
class FakeReminderDao : ReminderDao {
    private val store = mutableMapOf<String, ReminderEntity>()
    private val flow = MutableStateFlow<List<ReminderEntity>>(emptyList())

    private fun emitUpdate() {
        flow.value = store.values
            .filter { !it.isDeleted }
            .sortedBy { it.createdAt }
    }

    override fun getAllActive(): Flow<List<ReminderEntity>> {
        return flow.map { it.toList() }
    }

    override suspend fun getById(id: String): ReminderEntity? {
        return store[id]
    }

    override suspend fun upsert(reminder: ReminderEntity) {
        store[reminder.id] = reminder
        emitUpdate()
    }

    override suspend fun upsertAll(reminders: List<ReminderEntity>) {
        reminders.forEach { store[it.id] = it }
        emitUpdate()
    }

    override suspend fun getUnsynced(): List<ReminderEntity> {
        return store.values.filter { it.syncedAt == null || it.modifiedAt > it.syncedAt }
    }

    override suspend fun getAll(): List<ReminderEntity> {
        return store.values.toList()
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

    override fun getActiveForCalendarSelection(): Flow<List<ReminderEntity>> {
        return flow.map { entities ->
            entities.filter { it.isActive }
        }
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
 * Property-based tests for ReminderRepository using Kotest with JUnit 4 runner.
 *
 * Validates: Requirements 1.1, 2.1, 3.2, 4.2, 4.5, 4.7, 5.2
 */
@RunWith(io.kotest.runner.junit4.KotestTestRunner::class)
@OptIn(ExperimentalKotest::class)
class ReminderRepositoryPropertyTest : FunSpec({

    val propConfig = PropTestConfig(iterations = 100)

    // --- Generators ---

    val arbReminderName = Arb.string(minSize = 1, maxSize = 50)
    val arbIcon = Arb.string(minSize = 1, maxSize = 5)
    val arbColor = Arb.string(minSize = 7, maxSize = 7)

    data class ReminderInput(
        val name: String,
        val icon: String,
        val backgroundColor: String,
    )

    val arbReminderInput = arbitrary {
        ReminderInput(
            name = arbReminderName.bind(),
            icon = arbIcon.bind(),
            backgroundColor = arbColor.bind(),
        )
    }

    // --- Property 1: Creation produces a valid reminder record ---

    test("Property 1: Creation produces a valid reminder record") {
        /**
         * Validates: Requirements 1.1, 4.7
         *
         * For any valid reminder creation input, the resulting reminder has:
         * - UUID id (non-empty)
         * - modifiedAt >= before
         * - syncedAt = null
         * - isDeleted = false
         * - isActive = true
         * - all user-provided field values preserved exactly
         */
        checkAll(propConfig, arbReminderInput) { input ->
            val fakeDao = FakeReminderDao()
            val repository = ReminderRepository(fakeDao)

            val before = System.currentTimeMillis()
            val result = repository.create(
                name = input.name,
                icon = input.icon,
                backgroundColor = input.backgroundColor,
            )

            // UUID id is non-empty
            result.id.shouldNotBeEmpty()

            // modifiedAt >= before
            result.modifiedAt.shouldBeGreaterThanOrEqual(before)

            // createdAt == modifiedAt (set together on creation)
            result.createdAt shouldBe result.modifiedAt

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
        }
    }

    // --- Property 3: Display excludes deleted and orders by creation date ---

    test("Property 3: Display excludes deleted and orders by creation date") {
        /**
         * Validates: Requirements 2.1, 5.4
         *
         * For any collection of reminders with mixed isDeleted values,
         * getAllActive returns exactly those where isDeleted = false,
         * ordered by createdAt ASC.
         */
        val arbReminderEntity = arbitrary {
            ReminderEntity(
                id = java.util.UUID.randomUUID().toString(),
                name = arbReminderName.bind(),
                icon = arbIcon.bind(),
                backgroundColor = arbColor.bind(),
                isActive = Arb.boolean().bind(),
                createdAt = Arb.long(min = 1_000_000L, max = 9_999_999_999L).bind(),
                modifiedAt = Arb.long(min = 1_000_000L, max = 9_999_999_999L).bind(),
                syncedAt = null,
                isDeleted = Arb.boolean().bind(),
            )
        }

        checkAll(propConfig, Arb.list(arbReminderEntity, range = 0..20)) { entities ->
            val fakeDao = FakeReminderDao()
            val repository = ReminderRepository(fakeDao)

            // Insert all entities directly via the DAO
            entities.forEach { fakeDao.upsert(it) }

            // Collect the result
            val result = repository.getAllActive().first()

            // DAO uses UPSERT so last entry per ID wins.
            // Build the expected state after all upserts:
            val finalState = mutableMapOf<String, ReminderEntity>()
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

    // --- Property 6: Edit preserves system fields and updates modifiedAt ---

    test("Property 6: Edit preserves system fields and updates modifiedAt") {
        /**
         * Validates: Requirements 3.2
         *
         * For any reminder and valid modifications, update preserves
         * id/syncedAt/isDeleted, sets modifiedAt >= before, and
         * updates user fields to new values.
         */
        val arbModification = arbitrary {
            ReminderInput(
                name = arbReminderName.bind(),
                icon = arbIcon.bind(),
                backgroundColor = arbColor.bind(),
            )
        }

        checkAll(propConfig, arbReminderInput, arbModification) { original, modification ->
            val fakeDao = FakeReminderDao()
            val repository = ReminderRepository(fakeDao)

            // Create a reminder first
            val created = repository.create(
                name = original.name,
                icon = original.icon,
                backgroundColor = original.backgroundColor,
            )

            val before = System.currentTimeMillis()

            // Update the reminder
            repository.update(
                id = created.id,
                name = modification.name,
                icon = modification.icon,
                backgroundColor = modification.backgroundColor,
            )

            // Retrieve updated reminder
            val updated = repository.getById(created.id)!!

            // id is preserved
            updated.id shouldBe created.id

            // syncedAt is preserved (was null from creation)
            updated.syncedAt shouldBe created.syncedAt

            // isDeleted is preserved
            updated.isDeleted shouldBe created.isDeleted

            // createdAt is preserved (immutable)
            updated.createdAt shouldBe created.createdAt

            // modifiedAt >= before
            updated.modifiedAt.shouldBeGreaterThanOrEqual(before)

            // New field values are persisted
            updated.name shouldBe modification.name
            updated.icon shouldBe modification.icon
            updated.backgroundColor shouldBe modification.backgroundColor
        }
    }

    // --- Property 7: Toggle active state updates isActive and modifiedAt ---

    test("Property 7: Toggle active state updates isActive and modifiedAt") {
        /**
         * Validates: Requirements 4.2, 4.5
         *
         * For any reminder, deactivate flips isActive to false and updates modifiedAt,
         * activate flips isActive to true and updates modifiedAt,
         * while preserving all other fields unchanged.
         */
        checkAll(propConfig, arbReminderInput) { input ->
            val fakeDao = FakeReminderDao()
            val repository = ReminderRepository(fakeDao)

            // Create a reminder (isActive = true by default)
            val created = repository.create(
                name = input.name,
                icon = input.icon,
                backgroundColor = input.backgroundColor,
            )

            created.isActive.shouldBeTrue()

            val beforeDeactivate = System.currentTimeMillis()

            // Deactivate
            repository.deactivate(created.id)
            val afterDeactivate = repository.getById(created.id)!!

            afterDeactivate.isActive.shouldBeFalse()
            afterDeactivate.modifiedAt.shouldBeGreaterThanOrEqual(beforeDeactivate)

            // All other fields should be preserved
            afterDeactivate.id shouldBe created.id
            afterDeactivate.name shouldBe created.name
            afterDeactivate.icon shouldBe created.icon
            afterDeactivate.backgroundColor shouldBe created.backgroundColor
            afterDeactivate.createdAt shouldBe created.createdAt
            afterDeactivate.syncedAt shouldBe created.syncedAt
            afterDeactivate.isDeleted shouldBe created.isDeleted

            val beforeActivate = System.currentTimeMillis()

            // Activate again
            repository.activate(created.id)
            val afterActivate = repository.getById(created.id)!!

            afterActivate.isActive.shouldBeTrue()
            afterActivate.modifiedAt.shouldBeGreaterThanOrEqual(beforeActivate)

            // All other fields still preserved
            afterActivate.id shouldBe created.id
            afterActivate.name shouldBe created.name
            afterActivate.icon shouldBe created.icon
            afterActivate.backgroundColor shouldBe created.backgroundColor
            afterActivate.createdAt shouldBe created.createdAt
            afterActivate.syncedAt shouldBe created.syncedAt
            afterActivate.isDeleted shouldBe created.isDeleted
        }
    }

    // --- Property 10: Soft-delete sets correct field values ---

    test("Property 10: Soft-delete sets correct field values") {
        /**
         * Validates: Requirements 5.2
         *
         * For any reminder, softDelete sets isDeleted = true, syncedAt = null,
         * modifiedAt >= before, while preserving content fields.
         */
        checkAll(propConfig, arbReminderInput) { input ->
            val fakeDao = FakeReminderDao()
            val repository = ReminderRepository(fakeDao)

            // Create a reminder
            val created = repository.create(
                name = input.name,
                icon = input.icon,
                backgroundColor = input.backgroundColor,
            )

            val beforeDelete = System.currentTimeMillis()

            // Soft delete
            repository.softDelete(created.id)

            // Retrieve via getById (still works for deleted)
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
            deleted.createdAt shouldBe created.createdAt
        }
    }
})
