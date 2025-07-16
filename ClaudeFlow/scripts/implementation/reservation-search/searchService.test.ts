// Rough level tests - basic happy path only

import { ReservationSearchService } from './searchService';
import { Reservation } from './types';

describe('ReservationSearchService - Rough Level Tests', () => {
  let searchService: ReservationSearchService;
  let testReservations: Reservation[];

  beforeEach(() => {
    // Setup test data
    testReservations = [
      {
        id: '1',
        resourceId: 'room-1',
        resourceName: '会議室A',
        reservationName: 'プロジェクトミーティング',
        description: '週次定例会議',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        status: 'confirmed',
        createdAt: new Date('2024-01-01T00:00:00'),
        updatedAt: new Date('2024-01-01T00:00:00')
      },
      {
        id: '2',
        resourceId: 'room-2',
        resourceName: '会議室B',
        reservationName: '営業会議',
        description: '月次レビュー',
        startTime: new Date('2024-01-16T14:00:00'),
        endTime: new Date('2024-01-16T15:00:00'),
        status: 'pending',
        createdAt: new Date('2024-01-02T00:00:00'),
        updatedAt: new Date('2024-01-02T00:00:00')
      },
      {
        id: '3',
        resourceId: 'room-1',
        resourceName: '会議室A',
        reservationName: '研修会',
        description: '新人研修',
        startTime: new Date('2024-01-20T09:00:00'),
        endTime: new Date('2024-01-20T17:00:00'),
        status: 'confirmed',
        createdAt: new Date('2024-01-03T00:00:00'),
        updatedAt: new Date('2024-01-03T00:00:00')
      }
    ];

    searchService = new ReservationSearchService(testReservations);
  });

  test('検索サービスの初期化', () => {
    expect(searchService).toBeDefined();
    expect(searchService.getAllReservations()).toHaveLength(3);
  });

  test('全件検索（条件なし）', async () => {
    const result = await searchService.search({});
    
    expect(result.reservations).toHaveLength(3);
    expect(result.totalCount).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  test('キーワード検索', async () => {
    const result = await searchService.search({ keyword: '会議' });
    
    expect(result.reservations).toHaveLength(2);
    expect(result.reservations[0].reservationName).toContain('ミーティング');
    expect(result.reservations[1].reservationName).toContain('営業会議');
  });

  test('日付範囲検索', async () => {
    const result = await searchService.search({
      startDate: new Date('2024-01-14T00:00:00'),
      endDate: new Date('2024-01-18T00:00:00')
    });
    
    expect(result.reservations).toHaveLength(2);
    expect(result.reservations[0].id).toBe('1');
    expect(result.reservations[1].id).toBe('2');
  });

  test('ステータスフィルター', async () => {
    const result = await searchService.search({
      status: ['confirmed']
    });
    
    expect(result.reservations).toHaveLength(2);
    expect(result.reservations.every(r => r.status === 'confirmed')).toBe(true);
  });

  test('ページネーション', async () => {
    const result = await searchService.search({
      limit: 2,
      offset: 0
    });
    
    expect(result.reservations).toHaveLength(2);
    expect(result.totalCount).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(2);
  });

  test('複合検索', async () => {
    const result = await searchService.search({
      keyword: '会議室A',
      status: ['confirmed']
    });
    
    expect(result.reservations).toHaveLength(2);
    expect(result.reservations.every(r => r.resourceName === '会議室A')).toBe(true);
    expect(result.reservations.every(r => r.status === 'confirmed')).toBe(true);
  });

  test('予約の追加', () => {
    const newReservation: Reservation = {
      id: '4',
      resourceId: 'room-3',
      resourceName: '会議室C',
      reservationName: 'テスト予約',
      startTime: new Date('2024-01-25T10:00:00'),
      endTime: new Date('2024-01-25T11:00:00'),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    searchService.addReservation(newReservation);
    expect(searchService.getAllReservations()).toHaveLength(4);
  });
});