import { InMemoryReservationStore } from './inMemoryStore';
import { Reservation } from './types';

describe('InMemoryReservationStore - Rough Level', () => {
  let store: InMemoryReservationStore;

  beforeEach(() => {
    store = new InMemoryReservationStore();
  });

  describe('findById', () => {
    it('should find existing reservation', async () => {
      const reservation: Reservation = {
        id: 'test-001',
        title: 'Test Reservation',
        startDateTime: new Date('2024-01-10T10:00:00'),
        endDateTime: new Date('2024-01-10T11:00:00'),
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        status: 'active',
        version: 1
      };

      store.addReservation(reservation);

      const found = await store.findById('test-001');
      expect(found).toEqual(reservation);
    });

    it('should return null for non-existent reservation', async () => {
      const found = await store.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update reservation with correct version', async () => {
      const reservation: Reservation = {
        id: 'test-002',
        title: 'Original Title',
        startDateTime: new Date('2024-01-15T14:00:00'),
        endDateTime: new Date('2024-01-15T15:00:00'),
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        status: 'active',
        version: 1
      };

      store.addReservation(reservation);

      const success = await store.update('test-002', { title: 'Updated Title' }, 1);
      expect(success).toBe(true);

      const updated = await store.findById('test-002');
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.version).toBe(2);
    });

    it('should fail update with incorrect version', async () => {
      const reservation: Reservation = {
        id: 'test-003',
        title: 'Test',
        startDateTime: new Date(),
        endDateTime: new Date(),
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        status: 'active',
        version: 3
      };

      store.addReservation(reservation);

      const success = await store.update('test-003', { title: 'New Title' }, 1);
      expect(success).toBe(false);
    });

    it('should update multiple fields', async () => {
      const reservation: Reservation = {
        id: 'test-004',
        title: 'Original',
        description: 'Original desc',
        location: 'Room A',
        startDateTime: new Date('2024-02-01T10:00:00'),
        endDateTime: new Date('2024-02-01T11:00:00'),
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date('2024-01-01T00:00:00'),
        createdBy: 'user1',
        status: 'active',
        version: 1
      };

      store.addReservation(reservation);

      const updates = {
        title: 'Updated',
        description: 'Updated desc',
        location: 'Room B',
        participants: ['user1', 'user2', 'user3']
      };

      const success = await store.update('test-004', updates, 1);
      expect(success).toBe(true);

      const updated = await store.findById('test-004');
      expect(updated?.title).toBe('Updated');
      expect(updated?.description).toBe('Updated desc');
      expect(updated?.location).toBe('Room B');
      expect(updated?.participants).toEqual(['user1', 'user2', 'user3']);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(reservation.updatedAt.getTime());
    });
  });

  describe('findConflictingReservations', () => {
    it('should find overlapping reservations', async () => {
      const res1: Reservation = {
        id: 'conflict-001',
        title: 'Meeting 1',
        startDateTime: new Date('2024-03-01T10:00:00'),
        endDateTime: new Date('2024-03-01T11:00:00'),
        resourceId: 'room-1',
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        status: 'active',
        version: 1
      };

      const res2: Reservation = {
        id: 'conflict-002',
        title: 'Meeting 2',
        startDateTime: new Date('2024-03-01T10:30:00'),
        endDateTime: new Date('2024-03-01T11:30:00'),
        resourceId: 'room-1',
        participants: ['user2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user2',
        status: 'active',
        version: 1
      };

      store.addReservation(res1);
      store.addReservation(res2);

      const conflicts = await store.findConflictingReservations(
        'room-1',
        new Date('2024-03-01T10:45:00'),
        new Date('2024-03-01T11:15:00')
      );

      expect(conflicts).toHaveLength(2);
    });

    it('should exclude specified reservation', async () => {
      const res1: Reservation = {
        id: 'exclude-001',
        title: 'My Meeting',
        startDateTime: new Date('2024-03-05T14:00:00'),
        endDateTime: new Date('2024-03-05T15:00:00'),
        resourceId: 'room-2',
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        status: 'active',
        version: 1
      };

      const res2: Reservation = {
        id: 'exclude-002',
        title: 'Other Meeting',
        startDateTime: new Date('2024-03-05T14:30:00'),
        endDateTime: new Date('2024-03-05T15:30:00'),
        resourceId: 'room-2',
        participants: ['user2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user2',
        status: 'active',
        version: 1
      };

      store.addReservation(res1);
      store.addReservation(res2);

      const conflicts = await store.findConflictingReservations(
        'room-2',
        new Date('2024-03-05T14:00:00'),
        new Date('2024-03-05T15:00:00'),
        'exclude-001'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('exclude-002');
    });

    it('should not find conflicts for different resources', async () => {
      const res1: Reservation = {
        id: 'resource-001',
        title: 'Room A Meeting',
        startDateTime: new Date('2024-03-10T10:00:00'),
        endDateTime: new Date('2024-03-10T11:00:00'),
        resourceId: 'room-a',
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        status: 'active',
        version: 1
      };

      const res2: Reservation = {
        id: 'resource-002',
        title: 'Room B Meeting',
        startDateTime: new Date('2024-03-10T10:00:00'),
        endDateTime: new Date('2024-03-10T11:00:00'),
        resourceId: 'room-b',
        participants: ['user2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user2',
        status: 'active',
        version: 1
      };

      store.addReservation(res1);
      store.addReservation(res2);

      const conflicts = await store.findConflictingReservations(
        'room-a',
        new Date('2024-03-10T10:00:00'),
        new Date('2024-03-10T11:00:00')
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('resource-001');
    });
  });
});