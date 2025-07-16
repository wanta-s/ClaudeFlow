import { MemoryCalendarStore } from './MemoryCalendarStore';
import { Reservation, Resource } from './types';

describe('MemoryCalendarStore', () => {
  let store: MemoryCalendarStore;

  beforeEach(() => {
    store = new MemoryCalendarStore();
  });

  describe('addResource', () => {
    it('should add a resource successfully', () => {
      const resource: Resource = {
        id: 'room-1',
        name: 'Conference Room A',
        type: 'room',
        capacity: 10
      };

      store.addResource(resource);
      const retrieved = store.getResource('room-1');

      expect(retrieved).toEqual(resource);
    });
  });

  describe('getAllResources', () => {
    it('should return all added resources', () => {
      const resource1: Resource = {
        id: 'room-1',
        name: 'Conference Room A',
        type: 'room',
        capacity: 10
      };
      const resource2: Resource = {
        id: 'room-2',
        name: 'Conference Room B',
        type: 'room',
        capacity: 20
      };

      store.addResource(resource1);
      store.addResource(resource2);

      const allResources = store.getAllResources();
      expect(allResources).toHaveLength(2);
      expect(allResources).toContainEqual(resource1);
      expect(allResources).toContainEqual(resource2);
    });
  });

  describe('addReservation', () => {
    it('should add a reservation successfully', () => {
      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        date: new Date('2024-01-15'),
        timeSlot: '10:00-11:00',
        status: 'confirmed',
        items: []
      };

      store.addReservation('2024-01-15', reservation);
      const monthReservations = store.getMonthReservations(2024, 1);

      expect(monthReservations.get('2024-01-15')).toContainEqual(reservation);
    });
  });

  describe('getMonthReservations', () => {
    it('should return reservations for the specified month', () => {
      const reservation1: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        date: new Date('2024-01-15'),
        timeSlot: '10:00-11:00',
        status: 'confirmed',
        items: []
      };
      const reservation2: Reservation = {
        id: 'res-2',
        resourceId: 'room-1',
        date: new Date('2024-01-20'),
        timeSlot: '14:00-15:00',
        status: 'pending',
        items: []
      };
      const reservation3: Reservation = {
        id: 'res-3',
        resourceId: 'room-1',
        date: new Date('2024-02-01'),
        timeSlot: '09:00-10:00',
        status: 'confirmed',
        items: []
      };

      store.addReservation('2024-01-15', reservation1);
      store.addReservation('2024-01-20', reservation2);
      store.addReservation('2024-02-01', reservation3);

      const januaryReservations = store.getMonthReservations(2024, 1);

      expect(januaryReservations.size).toBe(2);
      expect(januaryReservations.get('2024-01-15')).toContainEqual(reservation1);
      expect(januaryReservations.get('2024-01-20')).toContainEqual(reservation2);
      expect(januaryReservations.get('2024-02-01')).toBeUndefined();
    });
  });
});