import { ReservationService } from './reservationService';
import { CreateReservationRequest } from './types';

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(() => {
    service = new ReservationService();
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      const request: CreateReservationRequest = {
        userId: 'user123',
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00')
      };

      const reservation = await service.createReservation(request);

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeDefined();
      expect(reservation.userId).toBe(request.userId);
      expect(reservation.resourceId).toBe(request.resourceId);
      expect(reservation.startTime).toEqual(request.startTime);
      expect(reservation.endTime).toEqual(request.endTime);
      expect(reservation.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for different reservations', async () => {
      const request1: CreateReservationRequest = {
        userId: 'user123',
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00')
      };

      const request2: CreateReservationRequest = {
        userId: 'user456',
        resourceId: 'room102',
        startTime: new Date('2024-01-20T14:00:00'),
        endTime: new Date('2024-01-20T15:00:00')
      };

      const reservation1 = await service.createReservation(request1);
      const reservation2 = await service.createReservation(request2);

      expect(reservation1.id).not.toBe(reservation2.id);
    });
  });

  describe('getReservation', () => {
    it('should retrieve a reservation by ID', async () => {
      const request: CreateReservationRequest = {
        userId: 'user123',
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00')
      };

      const created = await service.createReservation(request);
      const retrieved = await service.getReservation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent reservation', async () => {
      const result = await service.getReservation('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getUserReservations', () => {
    it('should retrieve all reservations for a user', async () => {
      const userId = 'user123';
      
      const request1: CreateReservationRequest = {
        userId,
        resourceId: 'room101',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00')
      };

      const request2: CreateReservationRequest = {
        userId,
        resourceId: 'room102',
        startTime: new Date('2024-01-20T14:00:00'),
        endTime: new Date('2024-01-20T15:00:00')
      };

      const request3: CreateReservationRequest = {
        userId: 'otherUser',
        resourceId: 'room103',
        startTime: new Date('2024-01-20T16:00:00'),
        endTime: new Date('2024-01-20T17:00:00')
      };

      await service.createReservation(request1);
      await service.createReservation(request2);
      await service.createReservation(request3);

      const userReservations = await service.getUserReservations(userId);

      expect(userReservations).toHaveLength(2);
      expect(userReservations.every(r => r.userId === userId)).toBe(true);
    });

    it('should return empty array for user with no reservations', async () => {
      const reservations = await service.getUserReservations('no-reservations-user');
      expect(reservations).toEqual([]);
    });
  });

  describe('getResourceReservations', () => {
    it('should retrieve all reservations for a resource', async () => {
      const resourceId = 'room101';
      
      const request1: CreateReservationRequest = {
        userId: 'user123',
        resourceId,
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:00:00')
      };

      const request2: CreateReservationRequest = {
        userId: 'user456',
        resourceId,
        startTime: new Date('2024-01-20T14:00:00'),
        endTime: new Date('2024-01-20T15:00:00')
      };

      const request3: CreateReservationRequest = {
        userId: 'user789',
        resourceId: 'room102',
        startTime: new Date('2024-01-20T16:00:00'),
        endTime: new Date('2024-01-20T17:00:00')
      };

      await service.createReservation(request1);
      await service.createReservation(request2);
      await service.createReservation(request3);

      const resourceReservations = await service.getResourceReservations(resourceId);

      expect(resourceReservations).toHaveLength(2);
      expect(resourceReservations.every(r => r.resourceId === resourceId)).toBe(true);
    });

    it('should return empty array for resource with no reservations', async () => {
      const reservations = await service.getResourceReservations('no-reservations-resource');
      expect(reservations).toEqual([]);
    });
  });
});