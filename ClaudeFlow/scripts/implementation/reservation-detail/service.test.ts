import { ReservationService } from './service';
import { ReservationRepository } from './repository';
import { ReservationDetail } from './types';

jest.mock('./repository');

describe('ReservationService', () => {
  let service: ReservationService;
  let mockRepository: jest.Mocked<ReservationRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReservationService();
    mockRepository = (service as any).repository;
  });

  describe('getReservationDetail', () => {
    it('should return reservation detail when found', async () => {
      const mockDetail: ReservationDetail = {
        id: '1',
        resourceId: 'res1',
        resourceName: '会議室A',
        userId: 'user1',
        userName: 'Guest User',
        startTime: '2024-01-20T10:00:00Z',
        endTime: '2024-01-20T11:00:00Z',
        status: 'confirmed',
        purpose: '会議',
        notes: 'プロジェクトミーティング',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z'
      };

      mockRepository.findDetailById.mockResolvedValue(mockDetail);

      const result = await service.getReservationDetail('1');

      expect(result).toEqual(mockDetail);
      expect(mockRepository.findDetailById).toHaveBeenCalledWith('1');
      expect(mockRepository.findDetailById).toHaveBeenCalledTimes(1);
    });

    it('should return null when reservation not found', async () => {
      mockRepository.findDetailById.mockResolvedValue(null);

      const result = await service.getReservationDetail('999');

      expect(result).toBeNull();
      expect(mockRepository.findDetailById).toHaveBeenCalledWith('999');
    });

    it('should pass through the reservation ID to repository', async () => {
      mockRepository.findDetailById.mockResolvedValue(null);

      await service.getReservationDetail('test-id-123');

      expect(mockRepository.findDetailById).toHaveBeenCalledWith('test-id-123');
    });
  });
});