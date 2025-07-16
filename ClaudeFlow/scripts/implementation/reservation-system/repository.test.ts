import { MemoryReservationRepository } from './repository';
import { Reservation } from './types';

describe('MemoryReservationRepository', () => {
  let repository: MemoryReservationRepository;

  beforeEach(() => {
    repository = new MemoryReservationRepository();
  });

  describe('save', () => {
    it('should save and return a reservation', () => {
      const reservation: Reservation = {
        id: 'test-id-1',
        resourceId: 'room-101',
        userId: 'user-123',
        date: '2024-01-20',
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Team meeting',
        participants: ['user-123', 'user-456'],
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = repository.save(reservation);

      expect(saved).toEqual(reservation);
      expect(saved.id).toBe('test-id-1');
    });
  });

  describe('findById', () => {
    it('should find a reservation by id', () => {
      const reservation: Reservation = {
        id: 'test-id-2',
        resourceId: 'room-102',
        userId: 'user-456',
        date: '2024-01-21',
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Client presentation',
        participants: ['user-456'],
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      repository.save(reservation);
      const found = repository.findById('test-id-2');

      expect(found).toEqual(reservation);
    });
  });

  describe('findConflicts', () => {
    it('should find conflicting reservations', () => {
      const existingReservation: Reservation = {
        id: 'conflict-1',
        resourceId: 'room-103',
        userId: 'user-789',
        date: '2024-01-22',
        startTime: '09:00',
        endTime: '11:00',
        purpose: 'Workshop',
        participants: ['user-789'],
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      repository.save(existingReservation);
      
      const conflicts = repository.findConflicts(
        'room-103',
        '2024-01-22',
        '10:00',
        '12:00'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(existingReservation);
    });
  });
});