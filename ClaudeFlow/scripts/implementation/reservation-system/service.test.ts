import { ReservationService } from './service';
import { MemoryReservationRepository } from './repository';
import { CreateReservationData } from './types';

describe('ReservationService', () => {
  let service: ReservationService;
  let repository: MemoryReservationRepository;

  beforeEach(() => {
    repository = new MemoryReservationRepository();
    service = new ReservationService(repository);
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', () => {
      const data: CreateReservationData = {
        resourceId: 'conference-room-1',
        userId: 'user-001',
        date: '2024-02-01',
        startTime: '13:00',
        endTime: '14:00',
        purpose: 'Project kickoff meeting',
        participants: ['user-001', 'user-002', 'user-003']
      };

      const reservation = service.createReservation(data);

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeTruthy();
      expect(reservation.resourceId).toBe('conference-room-1');
      expect(reservation.userId).toBe('user-001');
      expect(reservation.date).toBe('2024-02-01');
      expect(reservation.startTime).toBe('13:00');
      expect(reservation.endTime).toBe('14:00');
      expect(reservation.purpose).toBe('Project kickoff meeting');
      expect(reservation.participants).toEqual(['user-001', 'user-002', 'user-003']);
      expect(reservation.status).toBe('confirmed');
      expect(reservation.createdAt).toBeInstanceOf(Date);
      expect(reservation.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids for each reservation', () => {
      const data1: CreateReservationData = {
        resourceId: 'meeting-room-a',
        userId: 'user-100',
        date: '2024-02-10',
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Team standup',
        participants: ['user-100']
      };

      const data2: CreateReservationData = {
        resourceId: 'meeting-room-b',
        userId: 'user-200',
        date: '2024-02-11',
        startTime: '15:00',
        endTime: '16:00',
        purpose: 'Code review',
        participants: ['user-200']
      };

      const reservation1 = service.createReservation(data1);
      const reservation2 = service.createReservation(data2);

      expect(reservation1.id).not.toBe(reservation2.id);
    });
  });

  describe('checkAvailability', () => {
    it('should return true when resource is available', () => {
      const isAvailable = service.checkAvailability(
        'room-available',
        '2024-03-01',
        '09:00',
        '10:00'
      );

      expect(isAvailable).toBe(true);
    });

    it('should return false when resource has conflicts', () => {
      const existingData: CreateReservationData = {
        resourceId: 'room-busy',
        userId: 'user-existing',
        date: '2024-03-15',
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Training session',
        participants: ['user-existing']
      };

      service.createReservation(existingData);

      const isAvailable = service.checkAvailability(
        'room-busy',
        '2024-03-15',
        '15:00',
        '17:00'
      );

      expect(isAvailable).toBe(false);
    });
  });
});