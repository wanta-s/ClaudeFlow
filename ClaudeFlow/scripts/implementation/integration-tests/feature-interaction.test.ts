import { ReservationService } from '../reservationService'
import { ListReservationsService } from '../reservationListService'
import { getReservationById } from '../reservationDetail'
import { editReservation } from '../reservationEdit'
import { ReservationDeleteService } from '../reservation-delete-service-rough'
import { CalendarService } from '../calendar-view/CalendarService'
import { DailyReservationService } from '../daily-reservation/rough'
import { ReservationSearchService } from '../reservation-search/searchService'

describe('機能間相互作用テスト', () => {
  
  test('作成→編集→検索の連携', async () => {
    const reservationService = new ReservationService()
    const searchService = new ReservationSearchService()

    // 予約作成
    const created = await reservationService.createReservation({
      title: '初期タイトル',
      resourceId: 'room-1',
      startTime: new Date('2024-12-25T10:00:00'),
      endTime: new Date('2024-12-25T11:00:00'),
      reservedBy: 'user-1'
    })

    // 編集前の検索
    const beforeEdit = await searchService.search({ keyword: '初期タイトル' })
    expect(beforeEdit.results).toHaveLength(1)

    // 予約編集
    editReservation(created.id, {
      title: '更新後タイトル'
    })

    // 編集後の検索
    const afterEdit = await searchService.search({ keyword: '更新後タイトル' })
    expect(afterEdit.results).toHaveLength(1)
    
    const oldSearch = await searchService.search({ keyword: '初期タイトル' })
    expect(oldSearch.results).toHaveLength(0)
  })

  test('一覧表示とカレンダー表示の同期', async () => {
    const listService = new ListReservationsService()
    const calendarService = new CalendarService()
    const reservationService = new ReservationService()

    // 特定月に複数予約を作成
    const dates = [1, 5, 10, 15, 20, 25, 30]
    for (const date of dates) {
      await reservationService.createReservation({
        title: `1月${date}日の予約`,
        resourceId: 'shared-space',
        startTime: new Date(`2025-01-${date}T09:00:00`),
        endTime: new Date(`2025-01-${date}T10:00:00`),
        reservedBy: 'admin'
      })
    }

    // 一覧で取得
    const listResult = await listService.listReservations({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31')
    })

    // カレンダーで取得
    const calendarResult = await calendarService.getMonthCalendar(2025, 1)
    const calendarReservations = calendarResult.days
      .flatMap(day => day.reservations)
      .filter(r => r !== undefined)

    // 両方の結果が一致することを確認
    expect(listResult.reservations.length).toBe(dates.length)
    expect(calendarReservations.length).toBe(dates.length)
  })

  test('削除と各表示機能の連携', async () => {
    const reservationService = new ReservationService()
    const deleteService = new ReservationDeleteService()
    const listService = new ListReservationsService()
    const dailyService = new DailyReservationService()
    
    // 予約作成
    const reservation = await reservationService.createReservation({
      title: '削除テスト予約',
      resourceId: 'test-resource',
      startTime: new Date('2024-12-30T14:00:00'),
      endTime: new Date('2024-12-30T15:00:00'),
      reservedBy: 'tester'
    })

    // 削除前の確認
    const beforeDelete = await listService.listReservations({})
    const beforeDaily = await dailyService.getDailyReservations(new Date('2024-12-30'))
    
    expect(beforeDelete.reservations.find(r => r.id === reservation.id)).toBeTruthy()
    expect(beforeDaily.reservations.find(r => r.id === reservation.id)).toBeTruthy()

    // 予約削除
    await deleteService.cancelReservation(reservation.id)

    // 削除後の確認
    const afterDelete = await listService.listReservations({ status: 'confirmed' })
    const afterDaily = await dailyService.getDailyReservations(new Date('2024-12-30'))
    
    expect(afterDelete.reservations.find(r => r.id === reservation.id)).toBeFalsy()
    expect(afterDaily.reservations.find(r => r.id === reservation.id && r.status === 'confirmed')).toBeFalsy()
  })

  test('詳細表示と編集の相互作用', async () => {
    const reservationService = new ReservationService()
    
    // 予約作成
    const created = await reservationService.createReservation({
      title: 'オリジナル',
      resourceId: 'meeting-room',
      startTime: new Date('2024-12-28T13:00:00'),
      endTime: new Date('2024-12-28T14:00:00'),
      reservedBy: 'user-x'
    })

    // 初期詳細確認
    const detailBefore = await getReservationById(created.id)
    expect(detailBefore.reservation.title).toBe('オリジナル')

    // 編集実行
    editReservation(created.id, {
      title: '編集済み',
      description: '追加説明'
    })

    // 編集後詳細確認
    const detailAfter = await getReservationById(created.id)
    expect(detailAfter.reservation.title).toBe('編集済み')
    expect(detailAfter.reservation.description).toBe('追加説明')
  })

  test('複数機能での並行アクセス', async () => {
    const services = {
      reservation: new ReservationService(),
      list: new ListReservationsService(),
      search: new ReservationSearchService(),
      calendar: new CalendarService(),
      daily: new DailyReservationService()
    }

    // 並行して複数の予約を作成
    const createPromises = []
    for (let i = 0; i < 10; i++) {
      createPromises.push(
        services.reservation.createReservation({
          title: `並行予約${i}`,
          resourceId: `resource-${i % 3}`,
          startTime: new Date(`2024-12-2${i % 10}T${10 + i}:00:00`),
          endTime: new Date(`2024-12-2${i % 10}T${11 + i}:00:00`),
          reservedBy: `user-${i}`
        })
      )
    }

    await Promise.all(createPromises)

    // 並行して各機能からアクセス
    const accessPromises = [
      services.list.listReservations({}),
      services.search.search({ keyword: '並行' }),
      services.calendar.getMonthCalendar(2024, 12),
      services.daily.getDailyReservations(new Date('2024-12-25'))
    ]

    const results = await Promise.all(accessPromises)
    
    // 各機能が正常に動作していることを確認
    expect(results[0].reservations.length).toBeGreaterThan(0) // list
    expect(results[1].results.length).toBeGreaterThan(0) // search
    expect(results[2].days.some(d => d.reservations.length > 0)).toBe(true) // calendar
    expect(results[3]).toBeTruthy() // daily
  })
})