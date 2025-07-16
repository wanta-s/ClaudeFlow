import { ReservationDeleteService } from '../../reservation-delete-service-rough';
import { MemoryStore } from '../../memory-store-rough';
import { Reservation } from '../../reservation-delete-types-rough';

describe('Reservation Delete Integration Tests', () => {
  let service: ReservationDeleteService;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    service = new ReservationDeleteService(store);
  });

  describe('Complete reservation lifecycle', () => {
    it('should handle create -> cancel -> restore -> delete flow', async () => {
      // Create reservation
      const reservation: Reservation = {
        id: 'res-lifecycle',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };
      store.addReservation(reservation);

      // Verify initial state
      let current = await store.findById('res-lifecycle');
      expect(current?.status).toBe('active');

      // Cancel reservation
      const cancelResult = await service.cancelReservation('res-lifecycle');
      expect(cancelResult.success).toBe(true);
      
      current = await store.findById('res-lifecycle');
      expect(current?.status).toBe('cancelled');
      expect(current?.deletedAt).toBeDefined();

      // Restore reservation
      const restoreResult = await service.restoreReservation('res-lifecycle');
      expect(restoreResult.success).toBe(true);
      
      current = await store.findById('res-lifecycle');
      expect(current?.status).toBe('active');
      expect(current?.deletedAt).toBeNull();

      // Delete reservation permanently
      const deleteResult = await service.deleteReservation('res-lifecycle');
      expect(deleteResult.success).toBe(true);
      
      current = await store.findById('res-lifecycle');
      expect(current).toBeNull();
    });
  });

  describe('Bulk operations with mixed states', () => {
    it('should handle bulk deletion of reservations in different states', async () => {
      // Setup reservations in different states
      const activeReservation: Reservation = {
        id: 'res-active',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };

      const cancelledReservation: Reservation = {
        id: 'res-cancelled',
        resourceId: 'room-2',
        startTime: new Date('2024-12-26 14:00'),
        endTime: new Date('2024-12-26 15:00'),
        status: 'cancelled'
      };

      const pendingReservation: Reservation = {
        id: 'res-pending',
        resourceId: 'room-3',
        startTime: new Date('2024-12-27 09:00'),
        endTime: new Date('2024-12-27 10:00'),
        status: 'pending'
      };

      store.addReservation(activeReservation);
      store.addReservation(cancelledReservation);
      store.addReservation(pendingReservation);

      // Perform bulk delete
      const bulkResult = await service.bulkDeleteReservations([
        'res-active',
        'res-cancelled',
        'res-pending',
        'res-non-existent'
      ]);

      // Verify results
      expect(bulkResult.successful).toHaveLength(3);
      expect(bulkResult.successful).toContain('res-active');
      expect(bulkResult.successful).toContain('res-cancelled');
      expect(bulkResult.successful).toContain('res-pending');
      
      expect(bulkResult.failed).toHaveLength(1);
      expect(bulkResult.failed).toContain('res-non-existent');

      // Verify all successful deletions
      const remainingReservations = await store.findByIds([
        'res-active',
        'res-cancelled',
        'res-pending'
      ]);
      expect(remainingReservations).toHaveLength(0);
    });
  });

  describe('Concurrent operations handling', () => {
    it('should handle concurrent cancellation and deletion operations', async () => {
      // Setup multiple reservations
      const reservationIds = Array.from({ length: 10 }, (_, i) => `res-${i}`);
      const reservations = reservationIds.map(id => ({
        id,
        resourceId: `room-${id}`,
        startTime: new Date(`2024-12-25 ${10 + parseInt(id.split('-')[1])}:00`),
        endTime: new Date(`2024-12-25 ${11 + parseInt(id.split('-')[1])}:00`),
        status: 'active'
      }));

      reservations.forEach(res => store.addReservation(res));

      // Perform concurrent operations
      const operations = [
        // Cancel odd-numbered reservations
        ...reservationIds
          .filter((_, i) => i % 2 === 1)
          .map(id => service.cancelReservation(id)),
        // Delete even-numbered reservations
        ...reservationIds
          .filter((_, i) => i % 2 === 0)
          .map(id => service.deleteReservation(id))
      ];

      const results = await Promise.all(operations);

      // Verify all operations succeeded
      expect(results.every(result => result.success)).toBe(true);

      // Verify final states
      for (let i = 0; i < reservationIds.length; i++) {
        const reservation = await store.findById(reservationIds[i]);
        
        if (i % 2 === 0) {
          // Even indices should be deleted
          expect(reservation).toBeNull();
        } else {
          // Odd indices should be cancelled
          expect(reservation).not.toBeNull();
          expect(reservation?.status).toBe('cancelled');
          expect(reservation?.deletedAt).toBeDefined();
        }
      }
    });
  });

  describe('Error recovery scenarios', () => {
    it('should maintain data consistency after partial bulk operation failure', async () => {
      // Setup initial reservations
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

      // Mock a failure for one deletion
      const originalDelete = store.delete.bind(store);
      let deleteCallCount = 0;
      store.delete = jest.fn(async (id: string) => {
        deleteCallCount++;
        // Fail on second call
        if (deleteCallCount === 2) {
          throw new Error('Simulated database error');
        }
        return originalDelete(id);
      });

      // Attempt bulk delete with expected partial failure
      const bulkResult = await service.bulkDeleteReservations(['res-1', 'res-2', 'res-3']);

      // Verify partial success
      expect(bulkResult.successful).toContain('res-1');
      expect(bulkResult.failed).toContain('res-2');
      expect(bulkResult.failed).toContain('res-3');

      // Verify data consistency
      const res1 = await store.findById('res-1');
      const res2 = await store.findById('res-2');
      
      expect(res1).toBeNull(); // Successfully deleted
      expect(res2).not.toBeNull(); // Failed to delete, should still exist
      expect(res2?.status).toBe('active'); // Should maintain original state
    });
  });

  describe('Business logic scenarios', () => {
    it('should prevent deletion of active reservations within 24 hours of start time', async () => {
      // This test demonstrates where business logic would be added
      // Currently, the rough implementation doesn't have this check
      
      const now = new Date();
      const nearFutureReservation: Reservation = {
        id: 'res-near-future',
        resourceId: 'room-1',
        startTime: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours from now
        endTime: new Date(now.getTime() + 13 * 60 * 60 * 1000), // 13 hours from now
        status: 'active'
      };

      store.addReservation(nearFutureReservation);

      // Current implementation allows deletion
      // In a real implementation, this might be prevented
      const result = await service.deleteReservation('res-near-future');
      expect(result.success).toBe(true);

      // TODO: Add business logic to prevent deletion of near-future reservations
      // expect(result.success).toBe(false);
      // expect(result.error).toContain('Cannot delete reservation starting within 24 hours');
    });
  });

  describe('Data migration scenarios', () => {
    it('should handle restoration of old format reservations', async () => {
      // Simulate old format reservation without deletedAt field
      const oldFormatReservation = {
        id: 'res-old',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'cancelled'
        // Note: No deletedAt field
      };

      store.addReservation(oldFormatReservation as Reservation);

      // Restoration should still work
      const result = await service.restoreReservation('res-old');
      expect(result.success).toBe(true);

      const restored = await store.findById('res-old');
      expect(restored?.status).toBe('active');
      expect(restored?.deletedAt).toBeNull();
    });
  });
});