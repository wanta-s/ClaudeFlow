import { ReservationListService } from './service';

describe('ReservationListService', () => {
  let service: ReservationListService;

  beforeEach(() => {
    service = new ReservationListService();
  });

  describe('getReservations', () => {
    it('should return all reservations when no filter is provided', () => {
      const result = service.getReservations();
      
      expect(result.totalCount).toBe(2);
      expect(result.reservations).toHaveLength(2);
    });

    it('should filter by resourceId', () => {
      const result = service.getReservations({ resourceId: 'room-1' });
      
      expect(result.totalCount).toBe(1);
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].resourceId).toBe('room-1');
    });

    it('should filter by status', () => {
      const result = service.getReservations({ status: 'active' });
      
      expect(result.totalCount).toBe(1);
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].status).toBe('active');
    });

    it('should filter by both resourceId and status', () => {
      const result = service.getReservations({ 
        resourceId: 'room-1', 
        status: 'active' 
      });
      
      expect(result.totalCount).toBe(1);
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].resourceId).toBe('room-1');
      expect(result.reservations[0].status).toBe('active');
    });

    it('should return empty result when no reservations match filter', () => {
      const result = service.getReservations({ 
        resourceId: 'non-existent-room' 
      });
      
      expect(result.totalCount).toBe(0);
      expect(result.reservations).toHaveLength(0);
    });
  });
});