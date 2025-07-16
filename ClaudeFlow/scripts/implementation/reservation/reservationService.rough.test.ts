import { ReservationService } from './reservationService';
import { CreateReservationRequest } from './types';

describe('ReservationService - Rough Implementation Tests', () => {
  let service: ReservationService;

  beforeEach(() => {
    service = new ReservationService();
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      const request: CreateReservationRequest = {
        title: 'テスト予約',
        startDateTime: '2024-12-25T10:00:00+09:00',
        endDateTime: '2024-12-25T11:00:00+09:00',
        participants: [
          { name: 'テストユーザー', email: 'test@example.com' }
        ]
      };

      const reservation = await service.createReservation(request);

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeDefined();
      expect(reservation.title).toBe('テスト予約');
      expect(reservation.startDateTime).toEqual(new Date('2024-12-25T10:00:00+09:00'));
      expect(reservation.endDateTime).toEqual(new Date('2024-12-25T11:00:00+09:00'));
      expect(reservation.participants).toHaveLength(1);
      expect(reservation.participants[0]).toEqual({
        name: 'テストユーザー',
        email: 'test@example.com'
      });
    });

    it('should create a reservation with multiple participants', async () => {
      const request: CreateReservationRequest = {
        title: '複数参加者予約',
        startDateTime: '2024-12-26T14:00:00+09:00',
        endDateTime: '2024-12-26T15:00:00+09:00',
        participants: [
          { name: '参加者1', email: 'user1@example.com' },
          { name: '参加者2', email: 'user2@example.com' },
          { name: '参加者3', email: 'user3@example.com' }
        ]
      };

      const reservation = await service.createReservation(request);

      expect(reservation.participants).toHaveLength(3);
      expect(reservation.participants[0].name).toBe('参加者1');
      expect(reservation.participants[1].name).toBe('参加者2');
      expect(reservation.participants[2].name).toBe('参加者3');
    });
  });

  describe('getReservation', () => {
    it('should retrieve a created reservation', async () => {
      const request: CreateReservationRequest = {
        title: '取得テスト予約',
        startDateTime: '2024-12-27T09:00:00+09:00',
        endDateTime: '2024-12-27T10:00:00+09:00',
        participants: [
          { name: '取得テストユーザー', email: 'get@example.com' }
        ]
      };

      const created = await service.createReservation(request);
      const retrieved = await service.getReservation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('取得テスト予約');
    });
  });

  describe('getAllReservations', () => {
    it('should retrieve all created reservations', async () => {
      const request1: CreateReservationRequest = {
        title: '予約1',
        startDateTime: '2024-12-28T10:00:00+09:00',
        endDateTime: '2024-12-28T11:00:00+09:00',
        participants: [{ name: 'ユーザー1', email: 'user1@example.com' }]
      };

      const request2: CreateReservationRequest = {
        title: '予約2',
        startDateTime: '2024-12-28T14:00:00+09:00',
        endDateTime: '2024-12-28T15:00:00+09:00',
        participants: [{ name: 'ユーザー2', email: 'user2@example.com' }]
      };

      await service.createReservation(request1);
      await service.createReservation(request2);

      const allReservations = await service.getAllReservations();

      expect(allReservations).toHaveLength(2);
      expect(allReservations.map(r => r.title)).toContain('予約1');
      expect(allReservations.map(r => r.title)).toContain('予約2');
    });
  });
});