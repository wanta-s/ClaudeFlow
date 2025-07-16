import { MemoryStore } from '../../memory-store-rough';
import { Reservation } from '../../reservation-delete-types-rough';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  describe('findById', () => {
    it('should return reservation when it exists', async () => {
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
      const result = await store.findById('res-1');

      // Assert
      expect(result).toEqual(reservation);
    });

    it('should return null when reservation does not exist', async () => {
      // Act
      const result = await store.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update existing reservation and return true', async () => {
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
      const updateData = {
        status: 'cancelled',
        deletedAt: new Date('2024-12-25 12:00')
      };
      const result = await store.update('res-1', updateData);

      // Assert
      expect(result).toBe(true);
      
      const updatedReservation = await store.findById('res-1');
      expect(updatedReservation).toMatchObject({
        id: 'res-1',
        resourceId: 'room-1',
        status: 'cancelled',
        deletedAt: updateData.deletedAt
      });
    });

    it('should return false when updating non-existent reservation', async () => {
      // Act
      const result = await store.update('non-existent', { status: 'cancelled' });

      // Assert
      expect(result).toBe(false);
    });

    it('should handle partial updates', async () => {
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
      await store.update('res-1', { status: 'pending' });

      // Assert
      const updatedReservation = await store.findById('res-1');
      expect(updatedReservation).toMatchObject({
        id: 'res-1',
        resourceId: 'room-1',
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        status: 'pending'
      });
    });
  });

  describe('delete', () => {
    it('should delete existing reservation and return true', async () => {
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
      const result = await store.delete('res-1');

      // Assert
      expect(result).toBe(true);
      
      const deletedReservation = await store.findById('res-1');
      expect(deletedReservation).toBeNull();
    });

    it('should return false when deleting non-existent reservation', async () => {
      // Act
      const result = await store.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findByIds', () => {
    it('should return all existing reservations for given ids', async () => {
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
      const result = await store.findByIds(['res-1', 'res-3']);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual([reservations[0], reservations[2]]);
    });

    it('should return only existing reservations when some ids do not exist', async () => {
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
      const result = await store.findByIds(['res-1', 'non-existent', 'also-non-existent']);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(reservation);
    });

    it('should return empty array when no ids exist', async () => {
      // Act
      const result = await store.findByIds(['non-1', 'non-2', 'non-3']);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', async () => {
      // Act
      const result = await store.findByIds([]);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle duplicate ids', async () => {
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
      const result = await store.findByIds(['res-1', 'res-1', 'res-1']);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual([reservation, reservation, reservation]);
    });
  });

  describe('addReservation', () => {
    it('should add a new reservation', () => {
      // Arrange
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };

      // Act
      store.addReservation(reservation);

      // Assert
      const result = store['reservations'].get('res-1');
      expect(result).toEqual(reservation);
    });

    it('should overwrite existing reservation with same id', () => {
      // Arrange
      const reservation1: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        startTime: new Date('2024-12-25 10:00'),
        endTime: new Date('2024-12-25 11:00'),
        status: 'active'
      };
      
      const reservation2: Reservation = {
        id: 'res-1',
        resourceId: 'room-2',
        startTime: new Date('2024-12-26 14:00'),
        endTime: new Date('2024-12-26 15:00'),
        status: 'pending'
      };

      // Act
      store.addReservation(reservation1);
      store.addReservation(reservation2);

      // Assert
      const result = store['reservations'].get('res-1');
      expect(result).toEqual(reservation2);
      expect(store['reservations'].size).toBe(1);
    });
  });
});