import { ReservationListService } from './reservationListService';
import { InMemoryReservationStore } from './InMemoryReservationStore';
import { ReservationStatus } from './types';

describe('ReservationListService', () => {
  let service: ReservationListService;
  let repository: InMemoryReservationStore;

  beforeEach(() => {
    repository = new InMemoryReservationStore();
    service = new ReservationListService(repository);
  });

  describe('getReservations', () => {
    it('すべての予約を取得できる', async () => {
      const result = await service.getReservations();
      
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('ステータスでフィルタリングできる', async () => {
      const result = await service.getReservations({
        filter: { status: 'confirmed' }
      });
      
      expect(result.data.every(r => r.status === 'confirmed')).toBe(true);
    });

    it('複数のステータスでフィルタリングできる', async () => {
      const statuses: ReservationStatus[] = ['confirmed', 'pending'];
      const result = await service.getReservations({
        filter: { status: statuses }
      });
      
      expect(result.data.every(r => statuses.includes(r.status))).toBe(true);
    });

    it('リソースIDでフィルタリングできる', async () => {
      const result = await service.getReservations({
        filter: { resourceId: 'room-101' }
      });
      
      expect(result.data.every(r => r.resourceId === 'room-101')).toBe(true);
    });

    it('テキスト検索ができる', async () => {
      const result = await service.getReservations({
        filter: { searchText: '会議' }
      });
      
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some(r => 
        r.resourceName.includes('会議') || r.purpose.includes('会議')
      )).toBe(true);
    });

    it('開始日時の昇順でソートできる', async () => {
      const result = await service.getReservations({
        sort: { field: 'startTime', order: 'asc' }
      });
      
      for (let i = 1; i < result.data.length; i++) {
        expect(new Date(result.data[i].startTime).getTime())
          .toBeGreaterThanOrEqual(new Date(result.data[i - 1].startTime).getTime());
      }
    });

    it('ページネーションが機能する', async () => {
      const result = await service.getReservations({
        pagination: { page: 1, pageSize: 5 }
      });
      
      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(5);
      expect(result.pagination.totalPages).toBeGreaterThan(0);
    });
  });

  describe('getAvailableResources', () => {
    it('利用可能なリソース一覧を取得できる', async () => {
      const resources = await service.getAvailableResources();
      
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('id');
      expect(resources[0]).toHaveProperty('name');
    });
  });

  describe('getReservationStatuses', () => {
    it('予約ステータス一覧を取得できる', () => {
      const statuses = service.getReservationStatuses();
      
      expect(statuses).toEqual(['confirmed', 'pending', 'cancelled']);
    });
  });
});