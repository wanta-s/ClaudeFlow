import { InMemoryReservationStorage } from './storage';
import { Reservation } from './types';

describe('InMemoryReservationStorage - Rough Implementation Tests', () => {
  let storage: InMemoryReservationStorage;

  beforeEach(() => {
    storage = new InMemoryReservationStorage();
  });

  describe('save', () => {
    it('should save a reservation', async () => {
      const reservation: Reservation = {
        id: 'test-id-1',
        title: '保存テスト予約',
        startDateTime: new Date('2024-12-25T10:00:00+09:00'),
        endDateTime: new Date('2024-12-25T11:00:00+09:00'),
        participants: [
          { name: 'テストユーザー', email: 'test@example.com' }
        ]
      };

      const saved = await storage.save(reservation);

      expect(saved).toEqual(reservation);
    });
  });

  describe('findById', () => {
    it('should find a saved reservation by id', async () => {
      const reservation: Reservation = {
        id: 'test-id-2',
        title: '検索テスト予約',
        startDateTime: new Date('2024-12-26T14:00:00+09:00'),
        endDateTime: new Date('2024-12-26T15:00:00+09:00'),
        participants: [
          { name: '検索ユーザー', email: 'search@example.com' }
        ]
      };

      await storage.save(reservation);
      const found = await storage.findById('test-id-2');

      expect(found).toBeDefined();
      expect(found?.id).toBe('test-id-2');
      expect(found?.title).toBe('検索テスト予約');
    });

    it('should return undefined for non-existent id', async () => {
      const found = await storage.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no reservations', async () => {
      const all = await storage.findAll();
      expect(all).toEqual([]);
    });

    it('should return all saved reservations', async () => {
      const reservation1: Reservation = {
        id: 'test-id-3',
        title: '予約1',
        startDateTime: new Date('2024-12-27T09:00:00+09:00'),
        endDateTime: new Date('2024-12-27T10:00:00+09:00'),
        participants: [{ name: 'ユーザー1', email: 'user1@example.com' }]
      };

      const reservation2: Reservation = {
        id: 'test-id-4',
        title: '予約2',
        startDateTime: new Date('2024-12-27T11:00:00+09:00'),
        endDateTime: new Date('2024-12-27T12:00:00+09:00'),
        participants: [{ name: 'ユーザー2', email: 'user2@example.com' }]
      };

      await storage.save(reservation1);
      await storage.save(reservation2);

      const all = await storage.findAll();

      expect(all).toHaveLength(2);
      expect(all.map(r => r.id)).toContain('test-id-3');
      expect(all.map(r => r.id)).toContain('test-id-4');
    });
  });
});