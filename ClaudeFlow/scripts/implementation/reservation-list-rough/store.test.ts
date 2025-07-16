import { ReservationStore } from './store';

describe('ReservationStore', () => {
  let store: ReservationStore;

  beforeEach(() => {
    store = new ReservationStore();
  });

  describe('findAll', () => {
    it('should return all reservations', () => {
      const reservations = store.findAll();
      
      expect(reservations).toHaveLength(2);
      expect(reservations[0].id).toBe('1');
      expect(reservations[1].id).toBe('2');
    });

    it('should return sample data with correct structure', () => {
      const reservations = store.findAll();
      
      const firstReservation = reservations[0];
      expect(firstReservation).toMatchObject({
        id: '1',
        resourceId: 'room-1',
        userId: 'user-1',
        startTime: '2024-03-01T10:00:00Z',
        endTime: '2024-03-01T11:00:00Z',
        status: 'active'
      });
    });
  });
});