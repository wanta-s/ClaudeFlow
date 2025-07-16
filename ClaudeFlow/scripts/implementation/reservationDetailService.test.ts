import { ReservationDetailService, ReservationDetail, StorageAdapter } from './reservationDetailService';

describe('ReservationDetailService', () => {
  let service: ReservationDetailService;
  let mockStorage: StorageAdapter;
  
  const mockReservation: ReservationDetail = {
    id: 'test-123',
    title: 'Sample Reservation',
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };
  
  beforeEach(() => {
    mockStorage = {
      get: jest.fn().mockResolvedValue(mockReservation),
      exists: jest.fn().mockResolvedValue(true)
    };
    service = new ReservationDetailService(mockStorage);
  });
  
  describe('getDetail', () => {
    it('should return reservation details when ID exists', async () => {
      const result = await service.getDetail('test-123');
      
      expect(mockStorage.get).toHaveBeenCalledWith('test-123');
      expect(result).toEqual(mockReservation);
    });
  });
  
  describe('exists', () => {
    it('should return true when reservation exists', async () => {
      const result = await service.exists('test-123');
      
      expect(mockStorage.exists).toHaveBeenCalledWith('test-123');
      expect(result).toBe(true);
    });
  });
  
  describe('getStatus', () => {
    it('should return reservation status', async () => {
      const result = await service.getStatus('test-123');
      
      expect(mockStorage.get).toHaveBeenCalledWith('test-123');
      expect(result).toBe('confirmed');
    });
  });
});