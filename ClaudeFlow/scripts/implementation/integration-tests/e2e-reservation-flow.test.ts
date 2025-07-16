import { ReservationService } from '../reservationService'
import { ListReservationsService } from '../reservationListService'
import { getReservationById } from '../reservationDetail'
import { editReservation } from '../reservationEdit'
import { ReservationDeleteService } from '../reservation-delete-service-rough'
import { CalendarService } from '../calendar-view/CalendarService'
import { DailyReservationService } from '../daily-reservation/rough'
import { ReservationSearchService } from '../reservation-search/searchService'
import { InMemoryStorage } from '../storage'
import { InMemoryReservationStore } from '../InMemoryReservationStore'
import { MemoryStore } from '../memory-store-rough'

describe('予約システム統合テスト - エンドツーエンドフロー', () => {
  let storage: InMemoryStorage
  let reservationService: ReservationService
  let listService: ListReservationsService
  let deleteService: ReservationDeleteService
  let calendarService: CalendarService
  let dailyService: DailyReservationService
  let searchService: ReservationSearchService

  beforeEach(() => {
    storage = new InMemoryStorage()
    reservationService = new ReservationService(storage)
    listService = new ListReservationsService(new InMemoryReservationStore())
    deleteService = new ReservationDeleteService(new MemoryStore())
    calendarService = new CalendarService()
    dailyService = new DailyReservationService()
    searchService = new ReservationSearchService()
  })

  test('完全な予約ライフサイクル', async () => {
    // 1. 予約作成
    const createdReservation = await reservationService.createReservation({
      title: '会議室A予約',
      resourceId: 'room-a',
      startTime: new Date('2024-12-20T10:00:00'),
      endTime: new Date('2024-12-20T11:00:00'),
      reservedBy: 'user-123'
    })
    
    expect(createdReservation.id).toBeTruthy()
    expect(createdReservation.title).toBe('会議室A予約')

    // 2. 予約一覧での確認
    const listResult = await listService.listReservations({
      resourceId: 'room-a'
    })
    
    expect(listResult.reservations).toHaveLength(1)
    expect(listResult.reservations[0].id).toBe(createdReservation.id)

    // 3. 予約詳細表示
    const detail = await getReservationById(createdReservation.id)
    expect(detail.reservation.title).toBe('会議室A予約')
    expect(detail.reservation.resourceId).toBe('room-a')

    // 4. 予約編集
    const updatedReservation = editReservation(createdReservation.id, {
      title: '会議室A予約（更新）',
      endTime: new Date('2024-12-20T12:00:00')
    })
    
    expect(updatedReservation.title).toBe('会議室A予約（更新）')
    expect(updatedReservation.endTime).toEqual(new Date('2024-12-20T12:00:00'))

    // 5. カレンダービューで確認
    const calendarData = await calendarService.getMonthCalendar(2024, 12)
    const dec20 = calendarData.days.find(day => day.date === 20)
    expect(dec20?.reservations).toHaveLength(1)
    expect(dec20?.reservations[0].title).toBe('会議室A予約（更新）')

    // 6. 日別表示で確認
    const dailyData = await dailyService.getDailyReservations(new Date('2024-12-20'))
    expect(dailyData.reservations).toHaveLength(1)
    expect(dailyData.summary.totalReservations).toBe(1)

    // 7. 検索機能で確認
    const searchResults = await searchService.search({
      keyword: '会議室A',
      status: 'confirmed'
    })
    
    expect(searchResults.results).toHaveLength(1)
    expect(searchResults.results[0].title).toContain('会議室A')

    // 8. 予約削除（ソフトデリート）
    const cancelResult = await deleteService.cancelReservation(createdReservation.id)
    expect(cancelResult.status).toBe('cancelled')

    // 9. 削除後の一覧確認
    const afterDeleteList = await listService.listReservations({
      status: 'confirmed'
    })
    expect(afterDeleteList.reservations).toHaveLength(0)

    // 10. 削除済み予約の復元
    const restoreResult = await deleteService.restoreReservation(createdReservation.id)
    expect(restoreResult.status).toBe('confirmed')
  })

  test('複数予約の相互作用', async () => {
    // 複数の予約を作成
    const reservations = []
    for (let i = 0; i < 5; i++) {
      const reservation = await reservationService.createReservation({
        title: `予約${i + 1}`,
        resourceId: `resource-${i % 2}`,
        startTime: new Date(`2024-12-2${i}T10:00:00`),
        endTime: new Date(`2024-12-2${i}T11:00:00`),
        reservedBy: `user-${i % 3}`
      })
      reservations.push(reservation)
    }

    // フィルタリングテスト
    const filteredList = await listService.listReservations({
      resourceId: 'resource-0',
      sortBy: 'startTime',
      sortOrder: 'asc'
    })
    
    expect(filteredList.reservations.length).toBeGreaterThan(0)
    expect(filteredList.reservations.every(r => r.resourceId === 'resource-0')).toBe(true)

    // ページネーションテスト
    const pagedList = await listService.listReservations({
      page: 1,
      limit: 2
    })
    
    expect(pagedList.reservations).toHaveLength(2)
    expect(pagedList.totalCount).toBe(5)
    expect(pagedList.totalPages).toBe(3)

    // 一括削除テスト
    const idsToDelete = reservations.slice(0, 3).map(r => r.id)
    await deleteService.bulkDelete(idsToDelete)

    const remainingList = await listService.listReservations({})
    expect(remainingList.reservations).toHaveLength(2)
  })

  test('日付範囲検索とカレンダー表示の連携', async () => {
    // 月全体にわたる予約を作成
    const dates = [5, 10, 15, 20, 25]
    for (const date of dates) {
      await reservationService.createReservation({
        title: `12月${date}日の予約`,
        resourceId: 'shared-resource',
        startTime: new Date(`2024-12-${date}T14:00:00`),
        endTime: new Date(`2024-12-${date}T15:00:00`),
        reservedBy: 'test-user'
      })
    }

    // 日付範囲検索
    const midMonthSearch = await searchService.search({
      startDate: new Date('2024-12-10'),
      endDate: new Date('2024-12-20')
    })
    
    expect(midMonthSearch.results).toHaveLength(3) // 10, 15, 20日の予約

    // カレンダー表示で確認
    const calendar = await calendarService.getMonthCalendar(2024, 12)
    const reservedDays = calendar.days.filter(day => day.reservations.length > 0)
    
    expect(reservedDays).toHaveLength(5)
    expect(reservedDays.map(d => d.date).sort()).toEqual([5, 10, 15, 20, 25])
  })

  test('エラーケースのハンドリング', async () => {
    // 存在しない予約の取得
    const notFound = await getReservationById('non-existent-id')
    expect(notFound).toBeNull()

    // 存在しない予約の編集
    const editResult = editReservation('non-existent-id', { title: 'Updated' })
    expect(editResult).toBeNull()

    // 存在しない予約の削除
    const deleteResult = await deleteService.cancelReservation('non-existent-id')
    expect(deleteResult).toBeNull()

    // 無効な検索条件
    const emptySearch = await searchService.search({})
    expect(emptySearch.results).toEqual([])
  })
})