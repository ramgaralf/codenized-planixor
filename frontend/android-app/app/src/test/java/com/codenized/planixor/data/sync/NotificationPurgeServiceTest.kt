package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Unit tests for NotificationPurgeService.
 *
 * Property 3: Client purge identifies correct records
 * Validates: Requirements 2.1, 2.3, 2.7
 */
class NotificationPurgeServiceTest {

    private lateinit var notificationRecordDao: NotificationRecordDao
    private lateinit var calendarEventDao: CalendarEventDao
    private lateinit var purgeService: NotificationPurgeService

    private val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
    private val yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE)
    private val tomorrow = LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE)

    @Before
    fun setup() {
        notificationRecordDao = mockk(relaxed = true)
        calendarEventDao = mockk(relaxed = true)
        purgeService = NotificationPurgeService(notificationRecordDao, calendarEventDao)
    }

    @Test
    fun `should return 0 when no notification records exist`() = runTest {
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()

        val result = purgeService.purgePastNotifications()

        assertEquals(0, result)
        coVerify(exactly = 0) { notificationRecordDao.deleteByIds(any()) }
    }

    @Test
    fun `should purge records whose calendarEvent startDay is before today`() = runTest {
        val pastEventId = "event-past-1"
        val notificationId = "notif-1"

        coEvery { notificationRecordDao.getAll() } returns listOf(
            createNotificationRecord(id = notificationId, calendarEventId = pastEventId),
        )
        coEvery { calendarEventDao.getAll() } returns listOf(
            createCalendarEvent(id = pastEventId, startDay = yesterday),
        )

        val result = purgeService.purgePastNotifications()

        assertEquals(1, result)
        coVerify { notificationRecordDao.deleteByIds(listOf(notificationId)) }
    }

    @Test
    fun `should NOT purge records whose calendarEvent startDay equals today`() = runTest {
        val todayEventId = "event-today-1"
        val notificationId = "notif-1"

        coEvery { notificationRecordDao.getAll() } returns listOf(
            createNotificationRecord(id = notificationId, calendarEventId = todayEventId),
        )
        coEvery { calendarEventDao.getAll() } returns listOf(
            createCalendarEvent(id = todayEventId, startDay = today),
        )

        val result = purgeService.purgePastNotifications()

        assertEquals(0, result)
        coVerify(exactly = 0) { notificationRecordDao.deleteByIds(any()) }
    }

    @Test
    fun `should NOT purge records whose calendarEvent startDay is after today`() = runTest {
        val futureEventId = "event-future-1"
        val notificationId = "notif-1"

        coEvery { notificationRecordDao.getAll() } returns listOf(
            createNotificationRecord(id = notificationId, calendarEventId = futureEventId),
        )
        coEvery { calendarEventDao.getAll() } returns listOf(
            createCalendarEvent(id = futureEventId, startDay = tomorrow),
        )

        val result = purgeService.purgePastNotifications()

        assertEquals(0, result)
        coVerify(exactly = 0) { notificationRecordDao.deleteByIds(any()) }
    }

    @Test
    fun `should purge orphaned records with no matching calendarEvent`() = runTest {
        val orphanedNotificationId = "notif-orphaned-1"
        val nonExistentEventId = "event-does-not-exist"

        coEvery { notificationRecordDao.getAll() } returns listOf(
            createNotificationRecord(id = orphanedNotificationId, calendarEventId = nonExistentEventId),
        )
        coEvery { calendarEventDao.getAll() } returns emptyList()

        val result = purgeService.purgePastNotifications()

        assertEquals(1, result)
        coVerify { notificationRecordDao.deleteByIds(listOf(orphanedNotificationId)) }
    }

    @Test
    fun `should handle mixed records correctly`() = runTest {
        val pastEventId = "event-past"
        val todayEventId = "event-today"
        val futureEventId = "event-future"
        val orphanedEventId = "event-orphan"

        val pastNotifId = "notif-past"
        val todayNotifId = "notif-today"
        val futureNotifId = "notif-future"
        val orphanedNotifId = "notif-orphaned"

        coEvery { notificationRecordDao.getAll() } returns listOf(
            createNotificationRecord(id = pastNotifId, calendarEventId = pastEventId),
            createNotificationRecord(id = todayNotifId, calendarEventId = todayEventId),
            createNotificationRecord(id = futureNotifId, calendarEventId = futureEventId),
            createNotificationRecord(id = orphanedNotifId, calendarEventId = orphanedEventId),
        )
        coEvery { calendarEventDao.getAll() } returns listOf(
            createCalendarEvent(id = pastEventId, startDay = yesterday),
            createCalendarEvent(id = todayEventId, startDay = today),
            createCalendarEvent(id = futureEventId, startDay = tomorrow),
        )

        val result = purgeService.purgePastNotifications()

        assertEquals(2, result)
        coVerify {
            notificationRecordDao.deleteByIds(
                match { ids ->
                    ids.containsAll(listOf(pastNotifId, orphanedNotifId)) && ids.size == 2
                },
            )
        }
    }

    @Test
    fun `should return 0 when DAO operation fails and not throw`() = runTest {
        coEvery { notificationRecordDao.getAll() } throws RuntimeException("DB error")

        val result = purgeService.purgePastNotifications()

        assertEquals(0, result)
    }

    // --- Helper functions ---

    private fun createNotificationRecord(
        id: String,
        calendarEventId: String,
    ): NotificationRecordEntity = NotificationRecordEntity(
        id = id,
        calendarEventId = calendarEventId,
        alertOffset = 10,
        triggerTime = System.currentTimeMillis(),
        isDelivered = false,
        isRead = false,
        modifiedAt = System.currentTimeMillis(),
        syncedAt = null,
        isDeleted = false,
    )

    private fun createCalendarEvent(
        id: String,
        startDay: String,
    ): CalendarEventEntity = CalendarEventEntity(
        id = id,
        eventType = "shift",
        eventTypeId = "shift-1",
        startDay = startDay,
        endDay = startDay,
        startTime = 480,
        endTime = 960,
        totalHours = 480,
        notes = null,
        modifiedAt = System.currentTimeMillis(),
        syncedAt = null,
        isDeleted = false,
    )
}
