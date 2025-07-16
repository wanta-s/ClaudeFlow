import { ReservationService } from '../reservationService'
import { ListReservationsService } from '../reservationListService'
import { getReservationById } from '../reservationDetail'
import { editReservation, getStore } from '../reservationEdit'
import { ReservationDeleteService } from '../reservation-delete-service-rough'
import { CalendarService } from '../calendar-view/CalendarService'
import { DailyReservationService } from '../daily-reservation/rough'
import { ReservationSearchService } from '../reservation-search/searchService'

describe('データフローテスト', () => {
  
  test('データの一貫性 - 単一データソースの更新が全機能に反映', () => {
    const reservationService = new ReservationService()
    
    // 初期データ作成
    const reservation = reservationService.createReservation({
      title: 'データフローテスト',
      resourceId: 'resource-1',
      startTime: new Date('2024-12-15T10:00:00'),
      endTime: new Date('2024-12-15T11:00:00'),
      reservedBy: 'test-user'
    })

    // 各機能でデータを取得
    const listService = new ListReservationsService()
    const detailData = getReservationById(reservation.id)
    const searchService = new ReservationSearchService()

    // 同じデータが取得できることを確認
    const listResult = listService.listReservations({ resourceId: 'resource-1' })
    const searchResult = searchService.search({ keyword: 'データフロー' })

    expect(detailData?.reservation.id).toBe(reservation.id)
    expect(listResult.reservations.find(r => r.id === reservation.id)).toBeTruthy()
    expect(searchResult.results.find(r => r.id === reservation.id)).toBeTruthy()
  })

  test('トランザクション的な動作 - 複数更新の整合性', async () => {
    const services = {
      reservation: new ReservationService(),
      delete: new ReservationDeleteService()
    }

    // 複数の予約を作成
    const reservations = []
    for (let i = 0; i < 5; i++) {
      const r = await services.reservation.createReservation({
        title: `予約${i}`,
        resourceId: 'batch-resource',
        startTime: new Date(`2024-12-${20 + i}T10:00:00`),
        endTime: new Date(`2024-12-${20 + i}T11:00:00`),
        reservedBy: 'batch-user'
      })
      reservations.push(r)
    }

    // 一括削除実行
    const idsToDelete = reservations.map(r => r.id)
    await services.delete.bulkDelete(idsToDelete)

    // 全ての予約が削除されていることを確認
    const listService = new ListReservationsService()
    const remainingList = await listService.listReservations({ 
      resourceId: 'batch-resource',
      status: 'confirmed' 
    })

    expect(remainingList.reservations).toHaveLength(0)
  })

  test('データ変換の追跡 - 作成から表示まで', async () => {
    // 入力データ
    const inputData = {
      title: '変換テスト予約',
      resourceId: 'transform-test',
      startTime: new Date('2024-12-22T14:30:00'),
      endTime: new Date('2024-12-22T16:30:00'),
      reservedBy: 'transformer',
      description: 'データ変換のテスト'
    }

    // 1. 作成時の変換
    const reservationService = new ReservationService()
    const created = await reservationService.createReservation(inputData)
    
    expect(created.id).toBeTruthy() // IDが生成される
    expect(created.status).toBe('confirmed') // デフォルトステータス
    expect(created.createdAt).toBeTruthy() // タイムスタンプ追加

    // 2. リスト表示時の変換
    const listService = new ListReservationsService()
    const listData = await listService.listReservations({})
    const listedItem = listData.reservations.find(r => r.id === created.id)
    
    expect(listedItem).toMatchObject({
      id: created.id,
      title: inputData.title,
      resourceId: inputData.resourceId
    })

    // 3. カレンダー表示時の変換
    const calendarService = new CalendarService()
    const calendar = await calendarService.getMonthCalendar(2024, 12)
    const calendarDay = calendar.days.find(d => d.date === 22)
    const calendarItem = calendarDay?.reservations.find(r => r.id === created.id)
    
    expect(calendarItem).toBeTruthy()
    expect(calendarItem?.displayTime).toBeTruthy() // 表示用時間フォーマット

    // 4. 検索結果の変換
    const searchService = new ReservationSearchService()
    const searchResult = await searchService.search({ keyword: '変換テスト' })
    const searchItem = searchResult.results.find(r => r.id === created.id)
    
    expect(searchItem).toBeTruthy()
    expect(searchItem?.matchScore).toBeTruthy() // 検索スコア追加
  })

  test('データフィルタリングの連鎖', async () => {
    const reservationService = new ReservationService()
    
    // 様々な条件の予約を作成
    const testData = [
      { resourceId: 'room-a', status: 'confirmed', date: 10 },
      { resourceId: 'room-a', status: 'cancelled', date: 10 },
      { resourceId: 'room-b', status: 'confirmed', date: 10 },
      { resourceId: 'room-a', status: 'confirmed', date: 15 },
      { resourceId: 'room-b', status: 'confirmed', date: 20 }
    ]

    for (const data of testData) {
      await reservationService.createReservation({
        title: `${data.resourceId}-${data.status}-${data.date}`,
        resourceId: data.resourceId,
        startTime: new Date(`2024-12-${data.date}T10:00:00`),
        endTime: new Date(`2024-12-${data.date}T11:00:00`),
        reservedBy: 'filter-test',
        status: data.status
      })
    }

    // 段階的なフィルタリング
    const listService = new ListReservationsService()
    
    // フィルタ1: リソースで絞り込み
    const roomAOnly = await listService.listReservations({ 
      resourceId: 'room-a' 
    })
    expect(roomAOnly.reservations.length).toBe(3)

    // フィルタ2: さらにステータスで絞り込み
    const roomAConfirmed = await listService.listReservations({ 
      resourceId: 'room-a',
      status: 'confirmed'
    })
    expect(roomAConfirmed.reservations.length).toBe(2)

    // フィルタ3: さらに日付で絞り込み
    const roomAConfirmedDec10 = await listService.listReservations({ 
      resourceId: 'room-a',
      status: 'confirmed',
      startDate: new Date('2024-12-10'),
      endDate: new Date('2024-12-10T23:59:59')
    })
    expect(roomAConfirmedDec10.reservations.length).toBe(1)
  })

  test('データ集計の正確性', async () => {
    const services = {
      reservation: new ReservationService(),
      daily: new DailyReservationService(),
      calendar: new CalendarService()
    }

    // テストデータ作成
    const targetDate = new Date('2024-12-25')
    const reservationCount = 7
    
    for (let hour = 9; hour < 9 + reservationCount; hour++) {
      await services.reservation.createReservation({
        title: `${hour}時の予約`,
        resourceId: `resource-${hour % 3}`,
        startTime: new Date(`2024-12-25T${hour}:00:00`),
        endTime: new Date(`2024-12-25T${hour + 1}:00:00`),
        reservedBy: 'aggregation-test'
      })
    }

    // 日別サマリーの確認
    const dailySummary = await services.daily.getDailyReservations(targetDate)
    expect(dailySummary.summary.totalReservations).toBe(reservationCount)
    expect(dailySummary.summary.totalHours).toBe(reservationCount)

    // カレンダーサマリーの確認
    const calendar = await services.calendar.getMonthCalendar(2024, 12)
    const dec25 = calendar.days.find(d => d.date === 25)
    expect(dec25?.reservations.length).toBe(reservationCount)
    expect(dec25?.hasReservations).toBe(true)
  })
})