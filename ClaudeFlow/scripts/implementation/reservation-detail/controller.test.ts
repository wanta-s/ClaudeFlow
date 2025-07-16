import { Request, Response } from 'express';
import { ReservationController } from './controller';
import { ReservationService } from './service';
import { ReservationDetail } from './types';

jest.mock('./service');

describe('ReservationController', () => {
  let controller: ReservationController;
  let mockService: jest.Mocked<ReservationService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    
    mockRequest = {
      params: {}
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    controller = new ReservationController();
    mockService = (controller as any).service;
  });

  describe('getReservationDetail', () => {
    it('should return reservation detail with success response', async () => {
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

      mockRequest.params = { id: '1' };
      mockService.getReservationDetail.mockResolvedValue(mockDetail);

      await controller.getReservationDetail(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockService.getReservationDetail).toHaveBeenCalledWith('1');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockDetail
      });
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 404 error when reservation not found', async () => {
      mockRequest.params = { id: '999' };
      mockService.getReservationDetail.mockResolvedValue(null);

      await controller.getReservationDetail(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockService.getReservationDetail).toHaveBeenCalledWith('999');
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: '指定された予約が見つかりません'
        }
      });
    });

    it('should extract id from request params', async () => {
      mockRequest.params = { id: 'test-123' };
      mockService.getReservationDetail.mockResolvedValue(null);

      await controller.getReservationDetail(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockService.getReservationDetail).toHaveBeenCalledWith('test-123');
    });
  });
});