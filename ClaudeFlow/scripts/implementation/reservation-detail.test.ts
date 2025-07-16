import { ReservationDetail, SimpleCache, ReservationRepository, ReservationService } from './reservation-detail';

describe('ReservationDetail Tests', () => {
  describe('SimpleCache', () => {
    it('should store and retrieve values', () => {
      const cache = new SimpleCache<string>();
      cache.set('key1', 'value1');
      
      const result = cache.get('key1');
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new SimpleCache<string>();
      
      const result = cache.get('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('ReservationRepository', () => {
    it('should find reservation by id', () => {
      const repository = new ReservationRepository();
      
      const result = repository.findById('1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.restaurantName).toBe('レストランA');
    });

    it('should return undefined for non-existent id', () => {
      const repository = new ReservationRepository();
      
      const result = repository.findById('999');
      expect(result).toBeUndefined();
    });
  });

  describe('ReservationService', () => {
    it('should get reservation detail', () => {
      const service = new ReservationService();
      
      const result = service.getReservationDetail('1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.restaurantName).toBe('レストランA');
      expect(result?.numberOfGuests).toBe(2);
    });

    it('should return cached value on second call', () => {
      const service = new ReservationService();
      
      // 初回呼び出し
      const firstResult = service.getReservationDetail('1');
      expect(firstResult).toBeDefined();
      
      // 2回目の呼び出し（キャッシュから）
      const secondResult = service.getReservationDetail('1');
      expect(secondResult).toEqual(firstResult);
    });
  });
});