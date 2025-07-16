import { ReservationDeleteService } from '../../reservation-delete-service-rough';
import { MemoryStore } from '../../memory-store-rough';
import { Reservation } from '../../reservation-delete-types-rough';

describe('ReservationDeleteService', () => {
  let service: ReservationDeleteService;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    service = new ReservationDeleteService(store);
  });

  describe('cancelReservation', () => {
    it('should successfully cancel an existing reservation', async () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };
      store.addReservation(reservation);

      // Act
      const result = await service.cancelReservation('res-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.deletedId).toBe('res-1');
      
      const updatedReservation = await store.findById('res-1');
      expect(updatedReservation).not.toBeNull();
      expect(updatedReservation?.status).toBe('cancelled');
      expect(updatedReservation).toHaveProperty('deletedAt');
      expect(updatedReservation?.deletedAt).toBeInstanceOf(Date);
    });

    it('should return failure when canceling non-existent reservation', async () => {
      // Act
      const result = await service.cancelReservation('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.deletedId).toBeUndefined();
    });

    it('should handle multiple cancellations of the same reservation', async () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };
      store.addReservation(reservation);

      // Act
      const firstResult = await service.cancelReservation('res-1');
      const secondResult = await service.cancelReservation('res-1');

      // Assert
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
      
      const updatedReservation = await store.findById('res-1');
      expect(updatedReservation?.status).toBe('cancelled');
    });
  });

  describe('deleteReservation', () => {
    it('should successfully delete an existing reservation', async () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };
      store.addReservation(reservation);

      // Act
      const result = await service.deleteReservation('res-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.deletedId).toBe('res-1');
      
      const deletedReservation = await store.findById('res-1');
      expect(deletedReservation).toBeNull();
    });

    it('should return failure when deleting non-existent reservation', async () => {
      // Act
      const result = await service.deleteReservation('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.deletedId).toBeUndefined();
    });

    it('should handle force deletion parameter', async () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'cancelled'
      };
      store.addReservation(reservation);

      // Act
      const result = await service.deleteReservation('res-1', true);

      // Assert
      expect(result.success).toBe(true);
      expect(result.deletedId).toBe('res-1');
      
      const deletedReservation = await store.findById('res-1');
      expect(deletedReservation).toBeNull();
    });
  });

  describe('bulkDeleteReservations', () => {
    it('should successfully delete multiple reservations', async () => {
      // Arrange
      const reservations: Reservation[] = [
        {
          id: 'res-1',
          resourceId: 'room-1',
          startTime: new Date('2024-12-25 10:00'),
          endTime: new Date('2024-12-25 11:00'),
          status: 'active'
        },
        {
          id: 'res-2',
          resourceId: 'room-2',
          startTime: new Date('2024-12-26 14:00'),
          endTime: new Date('2024-12-26 15:00'),
          status: 'active'
        },
        {
          id: 'res-3',
          resourceId: 'room-3',
          startTime: new Date('2024-12-27 09:00'),
          endTime: new Date('2024-12-27 10:00'),
          status: 'active'
        }
      ];
      
      reservations.forEach(res => store.addReservation(res));

      // Act
      const result = await service.bulkDeleteReservations(['res-1', 'res-2', 'res-3']);

      // Assert
      expect(result.successful).toHaveLength(3);
      expect(result.successful).toEqual(['res-1', 'res-2', 'res-3']);
      expect(result.failed).toHaveLength(0);

      // Verify all reservations are deleted
      for (const id of ['res-1', 'res-2', 'res-3']) {
        const reservation = await store.findById(id);
        expect(reservation).toBeNull();
      }
    });

    it('should handle partial success in bulk deletion', async () => {
      // Arrange
      const reservations: Reservation[] = [
        {
          id: 'res-1',
          resourceId: 'room-1',
          startTime: new Date('2024-12-25 10:00'),
          endTime: new Date('2024-12-25 11:00'),
          status: 'active'
        },
        {
          id: 'res-2',
          resourceId: 'room-2',
          startTime: new Date('2024-12-26 14:00'),
          endTime: new Date('2024-12-26 15:00'),
          status: 'active'
        }
      ];
      
      reservations.forEach(res => store.addReservation(res));

      // Act
      const result = await service.bulkDeleteReservations(['res-1', 'non-existent', 'res-2', 'also-non-existent']);

      // Assert
      expect(result.successful).toHaveLength(2);
      expect(result.successful).toEqual(['res-1', 'res-2']);
      expect(result.failed).toHaveLength(2);
      expect(result.failed).toEqual(['non-existent', 'also-non-existent']);
    });

    it('should handle empty array input', async () => {
      // Act
      const result = await service.bulkDeleteReservations([]);

      // Assert
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle all failures in bulk deletion', async () => {
      // Act
      const result = await service.bulkDeleteReservations(['non-1', 'non-2', 'non-3']);

      // Assert
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(3);
      expect(result.failed).toEqual(['non-1', 'non-2', 'non-3']);
    });
  });

  describe('restoreReservation', () => {
    it('should successfully restore a cancelled reservation', async () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'cancelled'
      };
      store.addReservation(reservation);
      
      // First cancel it to add deletedAt
      await store.update('res-1', { deletedAt: new Date() });

      // Act
      const result = await service.restoreReservation('res-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.restoredId).toBe('res-1');
      
      const restoredReservation = await store.findById('res-1');
      expect(restoredReservation).not.toBeNull();
      expect(restoredReservation?.status).toBe('active');
      expect(restoredReservation?.deletedAt).toBeNull();
    });

    it('should return failure when restoring non-existent reservation', async () => {
      // Act
      const result = await service.restoreReservation('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.restoredId).toBeUndefined();
    });

    it('should restore already active reservation without error', async () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };
      store.addReservation(reservation);

      // Act
      const result = await service.restoreReservation('res-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.restoredId).toBe('res-1');
      
      const restoredReservation = await store.findById('res-1');
      expect(restoredReservation?.status).toBe('active');
    });
  });
});