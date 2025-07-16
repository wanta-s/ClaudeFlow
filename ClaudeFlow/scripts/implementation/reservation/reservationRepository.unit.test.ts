import { ReservationRepository } from './reservationRepository';
import { Reservation } from './types';

describe('ReservationRepository', () => {
  let repository: ReservationRepository;

  beforeEach(() => {
    repository = new ReservationRepository();
  });

  describe('save', () => {
    it('should save a reservation', async () => {
      const reservation: Reservation = {
        id: 'test-id-1',
        userId: 'user123',
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00'),
        createdAt: new Date()
      };

      await repository.save(reservation);
      const saved = await repository.findById('test-id-1');

      expect(saved).toEqual(reservation);
    });

    it('should update existing reservation with same ID', async () => {
      const reservation1: Reservation = {
        id: 'test-id-1',
        userId: 'user123',
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00'),
        createdAt: new Date()
      };

      const reservation2: Reservation = {
        ...reservation1,
        resourceId: 'room102'
      };

      await repository.save(reservation1);
      await repository.save(reservation2);

      const saved = await repository.findById('test-id-1');
      expect(saved?.resourceId).toBe('room102');
    });
  });

  describe('findById', () => {
    it('should find reservation by ID', async () => {
      const reservation: Reservation = {
        id: 'test-id-1',
        userId: 'user123',
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00'),
        createdAt: new Date()
      };

      await repository.save(reservation);
      const found = await repository.findById('test-id-1');

      expect(found).toEqual(reservation);
    });

    it('should return undefined for non-existent ID', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('findByUserId', () => {
    it('should find all reservations for a user', async () => {
      const userId = 'user123';

      const reservation1: Reservation = {
        id: 'test-id-1',
        userId,
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00'),
        createdAt: new Date()
      };

      const reservation2: Reservation = {
        id: 'test-id-2',
        userId,
        resourceId: 'room102',
        startTime: new Date('2024-01-20T14:00:00'),
        endTime: new Date('2024-01-20T15:00:00'),
        createdAt: new Date()
      };

      const reservation3: Reservation = {
        id: 'test-id-3',
        userId: 'otherUser',
        resourceId: 'room103',
        startTime: new Date('2024-01-20T16:00:00'),
        endTime: new Date('2024-01-20T17:00:00'),
        createdAt: new Date()
      };

      await repository.save(reservation1);
      await repository.save(reservation2);
      await repository.save(reservation3);

      const userReservations = await repository.findByUserId(userId);

      expect(userReservations).toHaveLength(2);
      expect(userReservations.map(r => r.id)).toContain('test-id-1');
      expect(userReservations.map(r => r.id)).toContain('test-id-2');
    });

    it('should return empty array for user with no reservations', async () => {
      const reservations = await repository.findByUserId('no-reservations');
      expect(reservations).toEqual([]);
    });
  });

  describe('findByResourceId', () => {
    it('should find all reservations for a resource', async () => {
      const resourceId = 'room101';

      const reservation1: Reservation = {
        id: 'test-id-1',
        userId: 'user123',
        resourceId,
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00'),
        createdAt: new Date()
      };

      const reservation2: Reservation = {
        id: 'test-id-2',
        userId: 'user456',
        resourceId,
        startTime: new Date('2024-01-20T14:00:00'),
        endTime: new Date('2024-01-20T15:00:00'),
        createdAt: new Date()
      };

      const reservation3: Reservation = {
        id: 'test-id-3',
        userId: 'user789',
        resourceId: 'room102',
        startTime: new Date('2024-01-20T16:00:00'),
        endTime: new Date('2024-01-20T17:00:00'),
        createdAt: new Date()
      };

      await repository.save(reservation1);
      await repository.save(reservation2);
      await repository.save(reservation3);

      const resourceReservations = await repository.findByResourceId(resourceId);

      expect(resourceReservations).toHaveLength(2);
      expect(resourceReservations.map(r => r.id)).toContain('test-id-1');
      expect(resourceReservations.map(r => r.id)).toContain('test-id-2');
    });

    it('should return empty array for resource with no reservations', async () => {
      const reservations = await repository.findByResourceId('no-reservations');
      expect(reservations).toEqual([]);
    });
  });
});