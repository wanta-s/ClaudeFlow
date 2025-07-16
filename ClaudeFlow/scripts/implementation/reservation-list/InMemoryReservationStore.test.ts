import { InMemoryReservationStore } from './InMemoryReservationStore';
import { ReservationStatus } from './types';

describe('InMemoryReservationStore', () => {
  let store: InMemoryReservationStore;

  beforeEach(() => {
    store = new InMemoryReservationStore();
  });

  describe('find', () => {
    it('フィルタなしで全件取得できる', async () => {
      const result = await store.find({});
      
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBe(result.data.length);
    });

    it('日付範囲でフィルタリングできる', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-20');
      
      const result = await store.find({
        filter: { dateFrom: startDate, dateTo: endDate }
      });
      
      expect(result.data.every(r => {
        const start = new Date(r.startTime);
        return start >= startDate && start <= endDate;
      })).toBe(true);
    });

    it('リソース名で降順ソートできる', async () => {
      const result = await store.find({
        sort: { field: 'resourceName', order: 'desc' }
      });
      
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].resourceName.localeCompare(result.data[i - 1].resourceName))
          .toBeLessThanOrEqual(0);
      }
    });

    it('ページネーションで2ページ目を取得できる', async () => {
      const pageSize = 3;
      const page1 = await store.find({
        pagination: { page: 1, pageSize }
      });
      const page2 = await store.find({
        pagination: { page: 2, pageSize }
      });
      
      expect(page2.data.length).toBeLessThanOrEqual(pageSize);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.hasNext).toBeDefined();
      expect(page2.pagination.hasPrevious).toBe(true);
    });
  });

  describe('getAllResources', () => {
    it('重複なくリソース一覧を取得できる', async () => {
      const resources = await store.getAllResources();
      
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      
      const ids = resources.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});